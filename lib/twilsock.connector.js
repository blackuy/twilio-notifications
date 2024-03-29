'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _freeze = require('babel-runtime/core-js/object/freeze');

var _freeze2 = _interopRequireDefault(_freeze);

var _set2 = require('babel-runtime/core-js/set');

var _set3 = _interopRequireDefault(_set2);

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

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _logger = require('./logger');

var _logger2 = _interopRequireDefault(_logger);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var DEFAULT_TTL = 60 * 60 * 48;

function toArray(_set) {
  var arr = [];
  _set.forEach(function (v) {
    return arr.push(v);
  });
  return arr;
}

/**
 * @class
 * @classdesc Registrar connector implementation for twilsock
 *
 * @constructor
 */

var TwilsockConnector = function (_EventEmitter) {
  (0, _inherits3.default)(TwilsockConnector, _EventEmitter);

  function TwilsockConnector(context, twilsock, config) {
    (0, _classCallCheck3.default)(this, TwilsockConnector);

    var _this = (0, _possibleConstructorReturn3.default)(this, (TwilsockConnector.__proto__ || (0, _getPrototypeOf2.default)(TwilsockConnector)).call(this));

    context.id = _uuid2.default.v4();

    (0, _defineProperties2.default)(_this, {
      _twilsock: { value: twilsock },
      _messageTypes: { value: new _set3.default() },

      config: { value: config },
      context: { value: context }
    });

    twilsock.on('stateChanged', function (state) {
      if (state !== 'connected') {
        _this.emit('transportReady', false);
      }
    });

    twilsock.on('registered', function (id) {
      if (context && id === context.id && twilsock.state === 'connected') {
        _this.emit('transportReady', true);
      }
    });
    return _this;
  }

  /**
   * @public
   */


  (0, _createClass3.default)(TwilsockConnector, [{
    key: 'setNotificationId',
    value: function setNotificationId() {
      return false;
    }

    /**
     * @public
     */

  }, {
    key: 'updateToken',
    value: function updateToken() {
      this._twilsock.removeNotificationsContext(this.context.id);
      this.context.id = _uuid2.default.v4();
      this._updateContext();
    }

    /**
     * @public
     */

  }, {
    key: 'has',
    value: function has(messageType) {
      return this._messageTypes.has(messageType);
    }

    /**
     * @public
     */

  }, {
    key: 'subscribe',
    value: function subscribe(messageType) {
      if (this._messageTypes.has(messageType)) {
        _logger2.default.trace('Message type already registered ', messageType);
        return false;
      }

      this._messageTypes.add(messageType);
      this._updateContext();
      return true;
    }

    /**
     * @public
     */

  }, {
    key: 'unsubscribe',
    value: function unsubscribe(messageType) {
      if (!this._messageTypes.has(messageType)) {
        return false;
      }

      this._messageTypes.delete(messageType);

      if (this._messageTypes.size > 0) {
        this._updateContext();
      } else {
        this._twilsock.removeNotificationsContext(this.context.id);
      }

      return true;
    }

    /**
     * @private
     */

  }, {
    key: '_updateContext',
    value: function _updateContext() {
      var messageTypes = toArray(this._messageTypes);

      /* eslint-disable camelcase */
      var context = {
        product_id: this.context.productId,
        notification_protocol_version: 4,
        endpoint_platform: this.context.platform,
        ttl: DEFAULT_TTL,
        token: this.config.token,
        message_types: messageTypes
      };
      /* eslint-enable camelcase */

      this.emit('transportReady', false);
      this._twilsock.setNotificationsContext(this.context.id, context);
    }
  }]);
  return TwilsockConnector;
}(_events2.default);

exports.default = TwilsockConnector;


(0, _freeze2.default)(TwilsockConnector);
module.exports = exports['default'];