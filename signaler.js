/* jshint node:true */

'use strict';

module.exports = function (io, room, options) {

  return {
    roomName: room,
    clients: [],

    //Find a user by ID
    findSocket: function (id) {
      var foundClient = false;
      this.clients.forEach(function (client) {
        if (client.id === id) {
          foundClient = client;
        }
      });
      return foundClient;
    },

    //Return an array of all other IDs
    getUserIds: function (currentId) {
      var ids = [];

      this.clients.forEach(function (client) {
        if (client.id !== currentId) {
          ids.push(client.id);
        }
      });

      return ids;
    },

    //Remove a user from our connected clients
    removeUser: function (id) {
      this.clients.forEach(function (client, index, clients) {
        if (client.id === id) {
          if (options.debug) console.log('Signaller: user ' + client.id + ' disconnected');
          clients.splice(index, 1);
        }
      });
    },

    //Start by binding all our events
    start: function () {

      this.room = io.of('/' + room);

      this.room.on('connection', function (socket) {

        //Add socket to room list
        this.clients.push(socket);

        //Give socket a reference to parent
        socket.room = this;

        //Join socket to room
        socket.join(this.roomName);

        //Return generated socket ID
        socket.emit('initialized');

        //Broadcast connection event
        socket.broadcast.to(this.roomName).emit('newconnection', socket.id);

        if (options.debug) console.log('Signaller: user ' + socket.id + ' connected');

        //Return a list of connected users
        socket.on('list', function () {
          socket.emit('list', this.room.getUserIds(this.id));
          if (options.debug) console.log('Signaller: user list sent');
        });

        //Send an offer to a target
        //Offer is an RTCSessionDescription
        socket.on('offer', function (data) {
          var recipient = this.room.findSocket(data.target);
          if (recipient) {
            recipient.emit('offer', {
              sender: this.id,
              offer: data.offer
            });
            if (options.debug) console.log('Signaller: user ' + this.id + ' sent offer to ' + recipient.id);
          }
        });

        //Send an anwer to a target
        //Answer is an RTCSessionDescription
        socket.on('answer', function (data) {
          var recipient = this.room.findSocket(data.target);
          if (recipient) {
            recipient.emit('answer', {
              sender: this.id,
              answer: data.answer
            });
            if (options.debug) console.log('Signaller: user ' + this.id + ' sent answer to ' + recipient.id);
          }
        });

        //Broadcast disconnect event to all connected clients
        socket.on('disconnect', function () {
          this.room.removeUser(this.id);
          this.room.room.emit('disconnect', this.id);
        });

        //Let an answering peer know that the offerer is connected
        socket.on('peerconnected', function (id) {
          var recipient = this.room.findSocket(id);
          if (recipient) {
            if (options.debug) console.log('Signaller: user ' + id + ' connected with user ' + this.id);
            recipient.emit('peerconnected', this.id);
          }
        });

        //Send ICE candidate to peer
        socket.on('icecandidate', function (data) {

          //Probably an unnecessary check but was throwing errors at one point
          var recipient = this.room.findSocket(data.target);
          if (recipient) {
            if (options.debug && options.debug === 'verbose') console.log('Sending ice candidate from ' + this.id + ' to ' + data.target);

            //Emit ice candidate
            recipient.emit('icecandidate', {
              sender: this.id,
              candidate: data.candidate
            });
          } else {
            if (options.debug) console.log('Recipient not found!');
          }
        });

        //Need to let peer know that stream has been removed to combat the phantom remote MediaStream bug
        socket.on('streamremoved', function (target) {
          var recipient = this.room.findSocket(target);
          if (recipient) {
            if (options.debug) console.log('Sending streamremoved from ' + this.id + ' to ' + target);
            recipient.emit('streamremoved', this.id);
          }
        });
      }.bind(this));
    }
  };
};