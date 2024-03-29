'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _freeze = require('babel-runtime/core-js/object/freeze');

var _freeze2 = _interopRequireDefault(_freeze);

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

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

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _registrar = require('./registrar.connector');

var _registrar2 = _interopRequireDefault(_registrar);

var _twilsock = require('./twilsock.connector');

var _twilsock2 = _interopRequireDefault(_twilsock);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Creates the new instance of ERS registrar client
 *
 * @class Registrar
 * @classdesc Provides an interface to the ERS registrar
 */
var Registrar = function (_EventEmitter) {
  (0, _inherits3.default)(Registrar, _EventEmitter);

  function Registrar(productId, transport, twilsock, config) {
    (0, _classCallCheck3.default)(this, Registrar);

    var _this = (0, _possibleConstructorReturn3.default)(this, (Registrar.__proto__ || (0, _getPrototypeOf2.default)(Registrar)).call(this));

    (0, _defineProperties2.default)(_this, {
      _conf: { value: config },
      _connectors: { value: new _map2.default() }
    });

    var platform = (typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : 'web').substring(0, 128);

    _this._connectors.set('twilsock', new _twilsock2.default({ productId: productId, platform: platform }, twilsock, config));
    _this._connectors.set('gcm', new _registrar2.default({ productId: productId, platform: platform }, transport, config, 'gcm'));
    _this._connectors.set('fcm', new _registrar2.default({ productId: productId, platform: platform }, transport, config, 'fcm'));
    _this._connectors.set('apn', new _registrar2.default({ productId: productId, platform: platform }, transport, config, 'apn'));

    _this._connectors.get('twilsock').on('transportReady', function (state) {
      return _this.emit('transportReady', state);
    });

    return _this;
  }

  /**
   *  Sets notification ID.
   *  If new URI is different from previous, it triggers updating of registration for given channel
   *
   *  @param {string} channelType channel type (apn|gcm|fcm|twilsock)
   *  @param {string} notificationId The notification ID
   */


  (0, _createClass3.default)(Registrar, [{
    key: 'setNotificationId',
    value: function setNotificationId(channelType, notificationId) {
      this._connector(channelType).setNotificationId(notificationId);
    }

    /**
     * Checks if subscription for given message and channel already exists
     */

  }, {
    key: 'hasSubscription',
    value: function hasSubscription(messageType, channelType) {
      this._connector(channelType).has(messageType);
    }

    /**
     * Subscribe for given type of message
     *
     * @param {String} messageType Message type identifier
     * @param {String} channelType Channel type, can be 'twilsock', 'gcm' or 'fcm'
     * @public
     */

  }, {
    key: 'subscribe',
    value: function subscribe(messageType, channelType) {
      this._connector(channelType).subscribe(messageType);
    }

    /**
     * Remove subscription
     * @param {String} messageType Message type
     * @param {String} channelType Channel type (twilsock or gcm/fcm)
     * @public
     */

  }, {
    key: 'unsubscribe',
    value: function unsubscribe(messageType, channelType) {
      this._connector(channelType).unsubscribe(messageType);
    }
  }, {
    key: 'updateToken',
    value: function updateToken() {
      this._connectors.forEach(function (connector) {
        return connector.updateToken();
      });
    }

    /**
     * @param {String} type Channel type
     * @throws {Error} Error with description
     * @private
     */

  }, {
    key: '_connector',
    value: function _connector(type) {
      var connector = this._connectors.get(type);
      if (!connector) {
        throw new Error('Unknown channel type: ' + type);
      }
      return connector;
    }
  }]);
  return Registrar;
}(_events2.default);

exports.default = Registrar;


(0, _freeze2.default)(Registrar);
module.exports = exports['default'];
