'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _from = require('babel-runtime/core-js/array/from');

var _from2 = _interopRequireDefault(_from);

var _loglevel = require('loglevel');

var _loglevel2 = _interopRequireDefault(_loglevel);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function prepareLine(prefix, args) {
  return [prefix].concat((0, _from2.default)(args));
}

exports.default = {
  setLevel: function setLevel(level) {
    _loglevel2.default.setLevel(level);
  },

  trace: function trace() {
    _loglevel2.default.trace.apply(null, prepareLine('Notify T:', arguments));
  },
  debug: function debug() {
    _loglevel2.default.debug.apply(null, prepareLine('Notify D:', arguments));
  },
  info: function info() {
    _loglevel2.default.info.apply(null, prepareLine('Notify I:', arguments));
  },
  warn: function warn() {
    _loglevel2.default.warn.apply(null, prepareLine('Notify W:', arguments));
  },
  error: function error() {
    _loglevel2.default.error.apply(null, prepareLine('Notify E:', arguments));
  }
};
module.exports = exports['default'];