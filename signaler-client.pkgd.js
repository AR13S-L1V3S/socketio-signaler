/* globals define, module, require */

(function () {
  'use strict';

  /**
   * Class for managing events.
   * Can be extended to provide event functionality in other classes.
   *
   * @class EventEmitter Manages event registering and emitting.
   */
  function EventEmitter() {}

  // Shortcuts to improve speed and size
  var proto = EventEmitter.prototype;
  var exports = this;
  var originalGlobalValue = exports.EventEmitter;

  /**
   * Finds the index of the listener for the event in it's storage array.
   *
   * @param {Function[]} listeners Array of listeners to search through.
   * @param {Function} listener Method to look for.
   * @return {Number} Index of the specified listener, -1 if not found
   * @api private
   */
  function indexOfListener(listeners, listener) {
    var i = listeners.length;
    while (i--) {
      if (listeners[i].listener === listener) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Alias a method while keeping the context correct, to allow for overwriting of target method.
   *
   * @param {String} name The name of the target method.
   * @return {Function} The aliased method
   * @api private
   */
  function alias(name) {
    return function aliasClosure() {
      return this[name].apply(this, arguments);
    };
  }

  /**
   * Returns the listener array for the specified event.
   * Will initialise the event object and listener arrays if required.
   * Will return an object if you use a regex search. The object contains keys for each matched event. So /ba[rz]/ might return an object containing bar and baz. But only if you have either defined them with defineEvent or added some listeners to them.
   * Each property in the object response is an array of listener functions.
   *
   * @param {String|RegExp} evt Name of the event to return the listeners from.
   * @return {Function[]|Object} All listener functions for the event.
   */
  proto.getListeners = function getListeners(evt) {
    var events = this._getEvents();
    var response;
    var key;

    // Return a concatenated array of all matching events if
    // the selector is a regular expression.
    if (typeof evt === 'object') {
      response = {};
      for (key in events) {
        if (events.hasOwnProperty(key) && evt.test(key)) {
          response[key] = events[key];
        }
      }
    } else {
      response = events[evt] || (events[evt] = []);
    }

    return response;
  };

  /**
   * Takes a list of listener objects and flattens it into a list of listener functions.
   *
   * @param {Object[]} listeners Raw listener objects.
   * @return {Function[]} Just the listener functions.
   */
  proto.flattenListeners = function flattenListeners(listeners) {
    var flatListeners = [];
    var i;

    for (i = 0; i < listeners.length; i += 1) {
      flatListeners.push(listeners[i].listener);
    }

    return flatListeners;
  };

  /**
   * Fetches the requested listeners via getListeners but will always return the results inside an object. This is mainly for internal use but others may find it useful.
   *
   * @param {String|RegExp} evt Name of the event to return the listeners from.
   * @return {Object} All listener functions for an event in an object.
   */
  proto.getListenersAsObject = function getListenersAsObject(evt) {
    var listeners = this.getListeners(evt);
    var response;

    if (listeners instanceof Array) {
      response = {};
      response[evt] = listeners;
    }

    return response || listeners;
  };

  /**
   * Adds a listener function to the specified event.
   * The listener will not be added if it is a duplicate.
   * If the listener returns true then it will be removed after it is called.
   * If you pass a regular expression as the event name then the listener will be added to all events that match it.
   *
   * @param {String|RegExp} evt Name of the event to attach the listener to.
   * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.addListener = function addListener(evt, listener) {
    var listeners = this.getListenersAsObject(evt);
    var listenerIsWrapped = typeof listener === 'object';
    var key;

    for (key in listeners) {
      if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {
        listeners[key].push(listenerIsWrapped ? listener : {
          listener: listener,
          once: false
        });
      }
    }

    return this;
  };

  /**
   * Alias of addListener
   */
  proto.on = alias('addListener');

  /**
   * Semi-alias of addListener. It will add a listener that will be
   * automatically removed after it's first execution.
   *
   * @param {String|RegExp} evt Name of the event to attach the listener to.
   * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.addOnceListener = function addOnceListener(evt, listener) {
    return this.addListener(evt, {
      listener: listener,
      once: true
    });
  };

  /**
   * Alias of addOnceListener.
   */
  proto.once = alias('addOnceListener');

  /**
   * Defines an event name. This is required if you want to use a regex to add a listener to multiple events at once. If you don't do this then how do you expect it to know what event to add to? Should it just add to every possible match for a regex? No. That is scary and bad.
   * You need to tell it what event names should be matched by a regex.
   *
   * @param {String} evt Name of the event to create.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.defineEvent = function defineEvent(evt) {
    this.getListeners(evt);
    return this;
  };

  /**
   * Uses defineEvent to define multiple events.
   *
   * @param {String[]} evts An array of event names to define.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.defineEvents = function defineEvents(evts) {
    for (var i = 0; i < evts.length; i += 1) {
      this.defineEvent(evts[i]);
    }
    return this;
  };

  /**
   * Removes a listener function from the specified event.
   * When passed a regular expression as the event name, it will remove the listener from all events that match it.
   *
   * @param {String|RegExp} evt Name of the event to remove the listener from.
   * @param {Function} listener Method to remove from the event.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.removeListener = function removeListener(evt, listener) {
    var listeners = this.getListenersAsObject(evt);
    var index;
    var key;

    for (key in listeners) {
      if (listeners.hasOwnProperty(key)) {
        index = indexOfListener(listeners[key], listener);

        if (index !== -1) {
          listeners[key].splice(index, 1);
        }
      }
    }

    return this;
  };

  /**
   * Alias of removeListener
   */
  proto.off = alias('removeListener');

  /**
   * Adds listeners in bulk using the manipulateListeners method.
   * If you pass an object as the second argument you can add to multiple events at once. The object should contain key value pairs of events and listeners or listener arrays. You can also pass it an event name and an array of listeners to be added.
   * You can also pass it a regular expression to add the array of listeners to all events that match it.
   * Yeah, this function does quite a bit. That's probably a bad thing.
   *
   * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add to multiple events at once.
   * @param {Function[]} [listeners] An optional array of listener functions to add.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.addListeners = function addListeners(evt, listeners) {
    // Pass through to manipulateListeners
    return this.manipulateListeners(false, evt, listeners);
  };

  /**
   * Removes listeners in bulk using the manipulateListeners method.
   * If you pass an object as the second argument you can remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
   * You can also pass it an event name and an array of listeners to be removed.
   * You can also pass it a regular expression to remove the listeners from all events that match it.
   *
   * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to remove from multiple events at once.
   * @param {Function[]} [listeners] An optional array of listener functions to remove.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.removeListeners = function removeListeners(evt, listeners) {
    // Pass through to manipulateListeners
    return this.manipulateListeners(true, evt, listeners);
  };

  /**
   * Edits listeners in bulk. The addListeners and removeListeners methods both use this to do their job. You should really use those instead, this is a little lower level.
   * The first argument will determine if the listeners are removed (true) or added (false).
   * If you pass an object as the second argument you can add/remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
   * You can also pass it an event name and an array of listeners to be added/removed.
   * You can also pass it a regular expression to manipulate the listeners of all events that match it.
   *
   * @param {Boolean} remove True if you want to remove listeners, false if you want to add.
   * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add/remove from multiple events at once.
   * @param {Function[]} [listeners] An optional array of listener functions to add/remove.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {
    var i;
    var value;
    var single = remove ? this.removeListener : this.addListener;
    var multiple = remove ? this.removeListeners : this.addListeners;

    // If evt is an object then pass each of it's properties to this method
    if (typeof evt === 'object' && !(evt instanceof RegExp)) {
      for (i in evt) {
        if (evt.hasOwnProperty(i) && (value = evt[i])) {
          // Pass the single listener straight through to the singular method
          if (typeof value === 'function') {
            single.call(this, i, value);
          } else {
            // Otherwise pass back to the multiple function
            multiple.call(this, i, value);
          }
        }
      }
    } else {
      // So evt must be a string
      // And listeners must be an array of listeners
      // Loop over it and pass each one to the multiple method
      i = listeners.length;
      while (i--) {
        single.call(this, evt, listeners[i]);
      }
    }

    return this;
  };

  /**
   * Removes all listeners from a specified event.
   * If you do not specify an event then all listeners will be removed.
   * That means every event will be emptied.
   * You can also pass a regex to remove all events that match it.
   *
   * @param {String|RegExp} [evt] Optional name of the event to remove all listeners for. Will remove from every event if not passed.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.removeEvent = function removeEvent(evt) {
    var type = typeof evt;
    var events = this._getEvents();
    var key;

    // Remove different things depending on the state of evt
    if (type === 'string') {
      // Remove all listeners for the specified event
      delete events[evt];
    } else if (type === 'object') {
      // Remove all events matching the regex.
      for (key in events) {
        if (events.hasOwnProperty(key) && evt.test(key)) {
          delete events[key];
        }
      }
    } else {
      // Remove all listeners in all events
      delete this._events;
    }

    return this;
  };

  /**
   * Alias of removeEvent.
   *
   * Added to mirror the node API.
   */
  proto.removeAllListeners = alias('removeEvent');

  /**
   * Emits an event of your choice.
   * When emitted, every listener attached to that event will be executed.
   * If you pass the optional argument array then those arguments will be passed to every listener upon execution.
   * Because it uses `apply`, your array of arguments will be passed as if you wrote them out separately.
   * So they will not arrive within the array on the other side, they will be separate.
   * You can also pass a regular expression to emit to all events that match it.
   *
   * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
   * @param {Array} [args] Optional array of arguments to be passed to each listener.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.emitEvent = function emitEvent(evt, args) {
    var listeners = this.getListenersAsObject(evt);
    var listener;
    var i;
    var key;
    var response;

    for (key in listeners) {
      if (listeners.hasOwnProperty(key)) {
        i = listeners[key].length;

        while (i--) {
          // If the listener returns true then it shall be removed from the event
          // The function is executed either with a basic call or an apply if there is an args array
          listener = listeners[key][i];

          if (listener.once === true) {
            this.removeListener(evt, listener.listener);
          }

          response = listener.listener.apply(this, args || []);

          if (response === this._getOnceReturnValue()) {
            this.removeListener(evt, listener.listener);
          }
        }
      }
    }

    return this;
  };

  /**
   * Alias of emitEvent
   */
  proto.trigger = alias('emitEvent');

  /**
   * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
   * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.
   *
   * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
   * @param {...*} Optional additional arguments to be passed to each listener.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.emit = function emit(evt) {
    var args = Array.prototype.slice.call(arguments, 1);
    return this.emitEvent(evt, args);
  };

  /**
   * Sets the current value to check against when executing listeners. If a
   * listeners return value matches the one set here then it will be removed
   * after execution. This value defaults to true.
   *
   * @param {*} value The new value to check for when executing listeners.
   * @return {Object} Current instance of EventEmitter for chaining.
   */
  proto.setOnceReturnValue = function setOnceReturnValue(value) {
    this._onceReturnValue = value;
    return this;
  };

  /**
   * Fetches the current value to check against when executing listeners. If
   * the listeners return value matches this one then it should be removed
   * automatically. It will return true by default.
   *
   * @return {*|Boolean} The current value to check for or the default, true.
   * @api private
   */
  proto._getOnceReturnValue = function _getOnceReturnValue() {
    if (this.hasOwnProperty('_onceReturnValue')) {
      return this._onceReturnValue;
    } else {
      return true;
    }
  };

  /**
   * Fetches the events object and creates one if required.
   *
   * @return {Object} The events storage object.
   * @api private
   */
  proto._getEvents = function _getEvents() {
    return this._events || (this._events = {});
  };

  /**
   * Reverts the global {@link EventEmitter} to its previous value and returns a reference to this version.
   *
   * @return {Function} Non conflicting EventEmitter class.
   */
  EventEmitter.noConflict = function noConflict() {
    exports.EventEmitter = originalGlobalValue;
    return EventEmitter;
  };

  // Expose the class either via AMD, CommonJS or the global object
  if (typeof define === 'function' && define.amd) {
    define('eventEmitter/EventEmitter', [], function () {
      return EventEmitter;
    });
  } else if (typeof module === 'object' && module.exports) {
    module.exports = EventEmitter;
  } else {
    this.EventEmitter = EventEmitter;
  }
}.call(this));

//UMD definition from https://github.com/umdjs/umd/blob/master/returnExports.js
(function (root, factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    define(['eventEmitter/EventEmitter', 'socket.io/socket.io-client'], function (EventEmitter, io) {
      return factory(window, EventEmitter, io);
    });
  } else if (typeof exports === 'object') {
    module.exports = factory(window, require('wolfy87-eventemitter'), require('socket.io-client'));
  } else {
    root.SignallerPeerConnection = factory(window, root.EventEmitter, root.io);
  }
}(this, function factory(window, EventEmitter, io) {
  'use strict';

  function SignallerPeerConnection(options) {

    this.peerConnections = [];

    //Declare our public STUN server
    this.iceServers = {
      iceServers: [{
        url: 'stun:stun.l.google.com:19302'
      }]
    };

    //Set constraints to properly negotiate connection
    this.constraints = {
      mandatory: {
        OfferToReceiveAudio: true,
        OfferToReceiveVideo: true,
      }
    };

    //Set up our prefixed defaults
    this.setupRTCObjects = function () {
      //PeerConnection
      this.PeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;

      //SessionDescription
      this.SessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;

      //GetUserMedia
      navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

      //RTCIceCandidate
      this.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate;
    };

    //Generate our option defaults
    this.generateDefaults = function (options) {
      options = options || {};
      options.server = options.server || 'http://' + window.location.host + '/';
      options.room = options.room || 'default';
      options.debug = options.debug || false;
      return options;
    };

    //Set up our event handlers
    this.bindEvents = function () {
      this.socket.on('initialized', this.getPeerList.bind(this));
      this.socket.on('list', this.generateConnections.bind(this));
      this.socket.on('offer', this.createAnswer.bind(this));
      this.socket.on('answer', this.handleAnswer.bind(this));
      this.socket.on('icecandidate', this.receiveIceCandidate.bind(this));
      this.socket.on('newconnection', this.addPeer.bind(this));
      this.socket.on('disconnect', this.disconnectConnection.bind(this));
      this.socket.on('peerconnected', this.peerConnected.bind(this));
      this.socket.on('streamremoved', this.removeRemoteStream.bind(this));
    };

    //Request our list of peers - all other users connected to the socket.io room
    this.getPeerList = function () {
      this.socket.emit('list');
    };

    //Generate our PeerConnections for each user received by getPeerList
    this.generateConnections = function (peers) {
      if (options.debug) console.log('Received list, creating connection(s) for ' + peers.length + ' peers');
      //Create a new connection for each peer
      peers.forEach(this.addPeer.bind(this));
    };

    //Add a peer to our connections, initializing the PeerConnection object
    //and sending an offer if we are currently broadcasting
    this.addPeer = function (id, suppress) {

      if (!this.hasPeer(id)) {
        console.log('Adding peer: ' + id);

        //Create new peer
        var peer = {
          connection: new this.PeerConnection(this.iceServers),
          id: id,
        };

        //Bind events
        peer = this.bindConnectionEvents(peer, suppress);

        //Add peer to array of connections
        this.peerConnections.push(peer);

        //If we are currently broadcasting, broadcast our stream to the newly added peer
        if (this.localStream) {
          this.addStreamToPeer(this.localStream, peer);
        }
        return peer;
      }

    };

    //Bind our PeerConnection events
    //Not using "onremovestream" because it seems to be in a buggy state - 
    //returning nonexistant remote connections on renegotiation
    this.bindConnectionEvents = function (peer, suppress) {
      if (options.debug) console.log('Binding connection events for peer: ' + peer.id);

      //Send ice candidate to peer
      peer.connection.onicecandidate = function (candidate) {
        if (options.debug && options.debug === 'verbose') console.log('Sending ICE candidate to ' + peer.id);

        this.socket.emit('icecandidate', {
          target: peer.id,
          candidate: candidate
        });

      }.bind(this);

      //When connection succeeds after stream is added, proxy event
      peer.connection.onaddstream = function (event) {
        //Checking suppress because if a connection is renegotiated and the remote maintains a 
        //stream, onaddstream will be fired twice
        if (options.debug) console.log('Remote stream added from ' + peer.id);
        if (!suppress) {
          this.emit('remoteStreamAdded', event.stream, peer.id);
        } else {
          if (options.debug) console.log('onaddstream event suppressed');
        }
      }.bind(this);

      //Untested
      peer.connection.ondatachannel = function (event) {
        if (options.debug) console.log('Data channel added from ' + peer.id);
        this.emit('dataChannelAdded', event.channel, peer.id);
      }.bind(this);

      return peer;
    };

    //Create our offer and set our local session description
    this.createOffer = function (peer) {

      if (options.debug) console.log('Creating offer for: ' + peer.id);

      //Create our offer
      peer.connection.createOffer(function (offer) {

        //Set local description from offer
        peer.connection.setLocalDescription(new this.SessionDescription(offer),

          //Send offer
          this.sendOffer({
            target: peer.id,
            offer: offer
          }), this.logError);

        //Pass constraints 
      }.bind(this), this.logError, this.constraints);
    };

    //Send offer to server
    this.sendOffer = function (offer) {
      if (options.debug) console.log('Sending offer to ' + offer.target);
      this.socket.emit('offer', offer);
    };

    //Set remote and local session description
    this.createAnswer = function (data) {

      //Retreive peer from this.peerConnections and set offer
      var peer = this.getPeer(data.sender),
        offer = data.offer;

      if (options.debug) console.log('Creating answer for ' + peer.id);

      //Set remote description from offer
      peer.connection.setRemoteDescription(new this.SessionDescription(offer), function () {

        //Callback after remote description set
        peer.connection.createAnswer(function (answer) {

          //Callback after answer created to set the local description
          peer.connection.setLocalDescription(new this.SessionDescription(answer),
            //Send answer back to peer
            this.sendAnswer({
              target: peer.id,
              answer: answer
            }), this.logError);

          //Set constraints for answer
        }.bind(this), this.logError, this.constraints);

        //Error logging for setRemoteDescription
      }.bind(this), this.logError);
    };

    //Send answer to server
    this.sendAnswer = function (answer) {
      if (options.debug) console.log('Sent answer to peer: ' + answer.target);
      this.socket.emit('answer', answer);
    };

    //Handle the answer received from peer
    this.handleAnswer = function (data) {
      var peer = this.getPeer(data.sender),
        answer = data.answer;

      if (options.debug) console.log('Handling answer from: ' + peer.id);

      //Set remote description
      peer.connection.setRemoteDescription(new this.SessionDescription(answer),

        //Trigger peer connected and emit to let peer know that we're good
        function () {
          this.peerConnected(peer.id);
          this.socket.emit('peerconnected', peer.id);
        }.bind(this), this.logError);
    };

    //Event fired when our peer is connected
    this.peerConnected = function (id) {
      this.emit('peerconnected', id);
      if (options.debug) console.log('Signaling with peer: ' + id);
    };

    //Disconnect a peer
    this.disconnectConnection = function (id) {

      //Get our peer
      var peer = this.getPeer(id);

      //Close connection
      peer.connection.close();

      //Proxy events out
      this.emit('peerDisconnected', id);
      this.emit('remoteStreamRemoved', id);
      if (options.debug) console.log('Disconnected with peer: ' + id);

      //Remove peer from internal array
      this.peerConnections.forEach(function (peer, index, peers) {
        if (peer.id === id) {
          peers.splice(index, 1);
        }
      });
    };

    //Find a peer by ID
    this.getPeer = function (id) {
      var foundPeer;

      //Match based on ID
      this.peerConnections.forEach(function (peer) {
        if (peer.id === id) {
          foundPeer = peer;
        }
      });

      //Create peer if it doesn't exist
      if (!foundPeer) {
        foundPeer = this.addPeer(id);
      }

      return foundPeer;
    };

    //Check if a peer exists based on ID
    this.hasPeer = function (id) {
      var foundPeer = false;
      this.peerConnections.forEach(function (peer) {
        if (peer.id === id) {
          foundPeer = true;
        }
      });

      return foundPeer;
    };

    //Log errors
    this.logError = function (error) {
      if (options.debug) console.error(error);
      else console.error('There was an error with the signaller');
    };

    //Add stream to all connections
    this.addStream = function (stream) {
      this.peerConnections.forEach(function (peer) {
        this.addStreamToPeer(stream, peer);
      }.bind(this));
    };

    //Add stream to single connection
    this.addStreamToPeer = function (stream, peer) {
      if (options.debug) console.log('Stream added to ' + peer.id);
      peer.connection.addStream(stream);

      //Need to renegotiate after a stream is added
      this.createOffer(peer);
    };

    //Add local webcam and/or microphone stream
    //Toggle video with opts.video and audio with opts.audio
    this.addLocalStream = function (opts) {
      opts = opts || {};
      //Request access
      navigator.getUserMedia({
        audio: opts.audio || true,
        video: opts.video || true,
        //Add stream to PeerConnection
      }, function (stream) {
        //Reference to our stream
        this.localStream = stream;

        //Add stream to all peers
        this.addStream(stream);

        //Proxy stream added event
        this.emit('localStreamAdded', stream);
        if (options.debug) console.log('Local stream added');
      }.bind(this), this.logError);
    };

    //Remove stream from all connections
    this.removeLocalStream = function () {
      //Stop recording
      this.localStream.stop();

      //Remove our local stream entirely
      this.localStream = undefined;

      this.peerConnections.forEach(function (peer) {
        if (options.debug) console.log('Local stream removed from ' + peer.id);

        this.socket.emit('streamremoved', peer.id);

        //Demolish stream
        this.regenStream(peer, true);

      }.bind(this));

      //Pass events through
      this.emit('localStreamRemoved');

    };

    //Remove stream
    this.removeRemoteStream = function (id) {
      this.emit('remoteStreamRemoved', id);
      if (options.debug) console.log('Removing stream from: ' + id);

      //Need to regenerate stream to deal with "phantom" remote MediaStream bug(?)
      this.regenStream(this.getPeer(id));
    };

    //Regenerate a stream by re-creating its PeerConnection and re-binding all events
    this.regenStream = function (peer, suppress) {

      if (options.debug) console.log('Regenerating PeerConnection for ' + peer.id);

      //If we are regenerating because we're removing a local connection and there is a remote stream
      suppress = suppress && peer.connection.getRemoteStreams().length;
      //Replace PeerConnection with new connection
      peer.connection = new this.PeerConnection(this.iceServers);
      //Bind connection events
      this.bindConnectionEvents(peer, suppress);
      //Add local stream if necessary
      if (this.localStream) {
        this.addStreamToPeer(this.localStream, peer);
      }
    };

    //Process ice candidate
    this.receiveIceCandidate = function (data) {

      //This is horrible, but that's the way the data is packaged
      if (data && data.candidate && data.candidate.candidate && data.candidate.candidate.candidate) {

        //Unpackage data
        var peer = this.getPeer(data.sender),
          candidate = data.candidate.candidate.candidate,
          line = data.candidate.candidate.sdpMLineIndex;

        if (options.debug && options.debug === 'verbose') console.log('Added ICE candidate from ' + peer.id);

        //Suppress error message if we're debugging after unnecessary ice candidates are sent - causes like 30 errors if you pause during connection
        peer.connection.addIceCandidate(new this.RTCIceCandidate({
          candidate: candidate,
          sdpMLineIndex: line,
        }));
      }
    };

    //Get our prefixed RTC objects
    this.setupRTCObjects();

    //Options defaults
    options = this.generateDefaults(options);

    //Set up our socket connection
    this.socket = io(options.server + options.room);

    //Bind our events
    this.bindEvents();
  }

  SignallerPeerConnection.prototype = new EventEmitter();

  return SignallerPeerConnection;
}));