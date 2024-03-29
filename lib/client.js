'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _freeze = require('babel-runtime/core-js/object/freeze');

var _freeze2 = _interopRequireDefault(_freeze);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _defineProperties = require('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _configuration = require('./configuration');

var _configuration2 = _interopRequireDefault(_configuration);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _bottleneck = require('bottleneck');

var _bottleneck2 = _interopRequireDefault(_bottleneck);

var _registrar = require('./registrar');

var _registrar2 = _interopRequireDefault(_registrar);

var _twilsock = require('twilsock');

var _twilsock2 = _interopRequireDefault(_twilsock);

var _twilioTransport = require('twilio-transport');

var _twilioTransport2 = _interopRequireDefault(_twilioTransport);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function limit(fn, to, per) {
  // overflow since no token is passed to arguments
  var limiter = new _bottleneck2.default(to, per, 1, _bottleneck2.default.strategy.LEAK);
  return function () {
    var args = Array.prototype.slice.call(arguments, 0);
    args.unshift(fn);
    return limiter.schedule.apply(limiter, args);
  };
}

/**
 * @class
 * @alias Notifications
 * @classdesc The helper library for the notification service.
 * Provides high level api for creating and managing notification subscriptions and receiving messages
 * Creates the instance of Notification helper library
 *
 * @constructor
 * @param {string} token - Twilio access token
 * @param {Notifications#ClientOptions} options - Options to customize client behavior
 */

var NotificationsClient = function (_EventEmitter) {
  (0, _inherits3.default)(NotificationsClient, _EventEmitter);

  function NotificationsClient(token, options) {
    (0, _classCallCheck3.default)(this, NotificationsClient);

    var _this = (0, _possibleConstructorReturn3.default)(this, (NotificationsClient.__proto__ || (0, _getPrototypeOf2.default)(NotificationsClient)).call(this));

    if (!token) {
      throw new Error('Token is required for Notifications client');
    }

    options = options || {};

    options.logLevel = options.logLevel || 'error';
    _logger2.default.setLevel(options.logLevel);

    var minTokenRefreshInterval = options.minTokenRefreshInterval || 10000;
    var productId = options.productId || 'notifications';

    options.twilsockClient = options.twilsockClient || new _twilsock2.default(token, options);
    options.transport = options.transport || new _twilioTransport2.default(options.twilsockClient);

    var twilsock = options.twilsockClient;
    var transport = options.transport;

    var reliableTransportState = {
      overall: false,
      transport: false,
      registration: false
    };

    var config = new _configuration2.default(token, options);

    (0, _defineProperties2.default)(_this, {
      _config: { value: config },
      _registrar: { value: new _registrar2.default(productId, transport, twilsock, config) },
      _twilsock: { value: twilsock },
      _reliableTransportState: { value: reliableTransportState },

      updateToken: { value: limit(_this._updateToken.bind(_this), 1, minTokenRefreshInterval), enumerable: true },
      connectionState: {
        get: function get() {
          if (_this._twilsock.state === 'disconnected') {
            return 'disconnected';
          } else if (_this._twilsock.state === 'disconnecting') {
            return 'disconnecting';
          } else if (_this._twilsock.state === 'connected' && _this._reliableTransportState.registration) {
            return 'connected';
          } else if (_this._twilsock.state === 'rejected') {
            return 'denied';
          }

          return 'connecting';
        }
      }
    });

    _this._onTransportStateChange(_this._twilsock.connected);

    _this._registrar.on('transportReady', function (state) {
      _this._onRegistrationStateChange(state ? 'registered' : '');
    });
    _this._registrar.on('stateChanged', function (state) {
      _this._onRegistrationStateChange(state);
    });
    _this._registrar.on('needReliableTransport', _this._onNeedReliableTransport.bind(_this));

    _this._twilsock.on('message', function (type, message) {
      return _this._routeMessage(type, message);
    });
    _this._twilsock.on('connected', function (notificationId) {
      _this._onTransportStateChange(true);
      _this._registrar.setNotificationId('twilsock', notificationId);
    });
    _this._twilsock.on('disconnected', function () {
      _this._onTransportStateChange(false);
    });
    return _this;
  }

  /**
   * Routes messages to the external subscribers
   * @private
   */


  (0, _createClass3.default)(NotificationsClient, [{
    key: '_routeMessage',
    value: function _routeMessage(type, message) {
      _logger2.default.trace('Message arrived: ', type, message);
      this.emit('message', type, message);
    }
  }, {
    key: '_onNeedReliableTransport',
    value: function _onNeedReliableTransport(isNeeded) {
      if (isNeeded) {
        this._twilsock.connect();
      } else {
        this._twilsock.disconnect();
      }
    }
  }, {
    key: '_onRegistrationStateChange',
    value: function _onRegistrationStateChange(state) {
      this._reliableTransportState.registration = state === 'registered';
      this._updateTransportState();
    }
  }, {
    key: '_onTransportStateChange',
    value: function _onTransportStateChange(connected) {
      this._reliableTransportState.transport = connected;
      this._updateTransportState();
    }
  }, {
    key: '_updateTransportState',
    value: function _updateTransportState() {
      var overallState = this._reliableTransportState.transport && this._reliableTransportState.registration;

      if (this._reliableTransportState.overall !== overallState) {
        this._reliableTransportState.overall = overallState;

        _logger2.default.info('Transport ready ' + overallState);
        this.emit('transportReady', overallState);
        this.emit('connectionStateChanged', this.connectionState);
      }
    }

    /**
     * Adds the subscription for the given message type
     * @param {string} messageType The type of message that you want to receive
     * @param {string} channelType. Supported are 'twilsock', 'gcm' and 'fcm'
     * @public
     */

  }, {
    key: 'subscribe',
    value: function subscribe(messageType, channelType) {
      channelType = channelType || 'twilsock';
      _logger2.default.trace('Add subscriptions for message type: ', messageType, channelType);

      return this._registrar.subscribe(messageType, channelType);
    }

    /**
     * Remove the subscription for the particular message type
     * @param {string} messageType The type of message that you don't want to receive anymore
     * @param {string} channelType. Supported are 'twilsock', 'gcm' and 'fcm'
     * @public
     */

  }, {
    key: 'unsubscribe',
    value: function unsubscribe(messageType, channelType) {
      channelType = channelType || 'twilsock';
      _logger2.default.trace('Remove subscriptions for message type: ', messageType, channelType);

      return this._registrar.unsubscribe(messageType, channelType);
    }

    /**
     * Handle incoming push notification.
     * Client application should call this method when it receives push notifications and pass the received data
     * @param {Object} msg - push message object
     * @public
     */

  }, {
    key: 'handlePushNotification',
    value: function handlePushNotification(msg) {
      _logger2.default.warn('Push message passed, but no functionality implemented yet: ' + msg);
    }

    /**
     * Set GCM/FCM token to enable application register for a push messages
     * @param {string} gcmToken/fcmToken Token received from GCM/FCM system
     * @public
     */

  }, {
    key: 'setPushRegistrationId',
    value: function setPushRegistrationId(registrationId, type) {
      this._registrar.setNotificationId(type || 'gcm', registrationId);
    }

    /**
     * Updates auth token for registration
     * @param {string} token Authentication token for registrations
     * @public
     */

  }, {
    key: '_updateToken',
    value: function _updateToken(token) {
      _logger2.default.info('authTokenUpdated');
      if (this._config.token !== token) {
        this._twilsock.updateToken(token);

        this._config.updateToken(token);
        this._registrar.updateToken();
      }
      return _promise2.default.resolve();
    }
  }]);
  return NotificationsClient;
}(_events2.default);

exports.default = NotificationsClient;


(0, _freeze2.default)(NotificationsClient);

/**
 * Fired when new message arrived.
 * @param {Object} message`
 * @event NotificationsClient#message
 */

/**
 * Fired when transport state has changed
 * @param {boolean} transport state
 * @event NotificationsClient#transportReady
 */

/**
 * Fired when transport state has been changed
 * @param {string} transport state
 * @event NotificationsClient#connectionStateChanged
 */

/**
 * These options can be passed to Client constructor
 * @typedef {Object} Notifications#ClientOptions
 * @property {String} [logLevel='error'] - The level of logging to enable. Valid options
 *   (from strictest to broadest): ['silent', 'error', 'warn', 'info', 'debug', 'trace']
 */

module.exports = exports['default'];