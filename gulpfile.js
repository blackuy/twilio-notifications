const gulp = require('gulp');
const gutil = require('gulp-util');
const mocha = require('gulp-mocha');
const istanbul = require('gulp-istanbul');
const eslint = require('gulp-eslint');
const browserify = require('browserify');
const babelify = require('babelify');
const babel = require('babel-core/register');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const exit = require('gulp-exit');
const insert = require('gulp-insert');
const runSequence = require('run-sequence');
const del = require('del');
const fs = require('fs');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const cheerio = require('cheerio');
const tap = require('gulp-tap');
const derequire = require('gulp-derequire');
const isparta = require('isparta');

const pkg = require('./package');

var cp = require('child_process');
var jsdoc = 'node_modules/jsdoc/jsdoc.js';

const product = {
  source: {
    name: pkg.name + '.js',
    lib: 'src/*.js'
  },
  packaged: {
    dir: 'dist',
    name: pkg.name + '.js',
    minified: pkg.name + '.min.js'
  },
  bundled: {
    dir: 'build',
    name: pkg.name + '-bundle.js'
  },
  license: 'LICENSE'
};

const tests = {
  lint: {
    files: [
      'src/*.js',
      '!src/utils.js',
      '!src/jsondiff.js',
      'gulpfile.js'
    ]
  },
  unit: {
    files: 'test/unit/spec/*.js',
    index: 'test/unit/index.js'
  },
  integration: {
    files: 'test/integration/**/*.js',
    index: 'test/integration/index.js'
  }
};

const coverage = {
  dir: product.packaged.dir + '/coverage'
};

const docs = {
  dir: product.packaged.dir + '/docs',
  conf: 'jsdoc.json',
  files: [
    './src/client.js'
  ],
  publicConstructors: ['NotificationsClient'],
};

gulp.task('lint', function() {
  return gulp.src(tests.lint.files)
      .pipe(eslint())
      .pipe(eslint.format())
      .pipe(eslint.failAfterError());
});

gulp.task('istanbul-setup', function() {
  return gulp.src([product.source.lib])
    .pipe(istanbul({
      instrumenter: isparta.Instrumenter,
      includeUntested: true
    }))
    .pipe(istanbul.hookRequire());
});

gulp.task('unit-test', ['istanbul-setup'], function() {
  return gulp.src(tests.unit.index, { read: false })
    .pipe(mocha({
      compilers: { js: babel },
      reporter: 'spec'
    }))
    .pipe(istanbul.writeReports({
      dir: coverage.dir,
      reporters: ['cobertura', 'lcov', 'text'],
      reportOpts: { dir: coverage.dir }
    }));
});

gulp.task('integration-test', function() {
  return gulp.src(tests.integration.index, { read: false })
    .pipe(mocha({ reporter: 'spec', timeout: 5000 }))
    .pipe(exit());
});

gulp.task('bundle', function(done) {
  browserify({ debug: false, standalone: 'Twilio.Notification.Client', entries: ['./src/index.js'] })
    .exclude('ws')
    .transform(babelify, {
      global: true,
      ignore: /\/node_modules\/(?!twilio-transport|twilsock\/)/
    })
    .bundle()
    .pipe(source(product.bundled.name))
    .pipe(buffer())
    .pipe(derequire())
    .pipe(gulp.dest(product.bundled.dir))
    .once('end', done)
    .once('error', exit);
});

gulp.task('license', function() {
  var licenseContents = fs.readFileSync(product.license);
  return gulp.src(product.bundled.dir + '/' + product.bundled.name)
    .pipe(insert.prepend(
      '/* ' + pkg.name + '.js ' + pkg.version + '\n'
      + licenseContents
      + '*/\n\n'
    ))
    .pipe(rename(product.packaged.name))
    .pipe(gulp.dest(product.packaged.dir));
});

gulp.task('minify', function() {
  return gulp.src(product.packaged.dir + '/' + product.packaged.name)
    .pipe(uglify({
      output: {
        ascii_only: true // eslint-disable-line camelcase
      },
      preserveComments: 'license'
    }).on('error', gutil.log))
    .pipe(rename(product.packaged.minified))
    .pipe(gulp.dest(product.packaged.dir));
});

gulp.task('build', function(done) {
  runSequence('bundle', 'license', done);
});

gulp.task('package', function(done) {
  runSequence('minify', done);
});

gulp.task('generate-doc', function(cb) {
  cp.exec(['node', jsdoc,
          '-d', docs.dir,
          '-c', docs.conf,
          docs.files.join(' '),
          './README.md',
          '-t ./node_modules/ink-docstrap/template'].join(' '), cb);
});

gulp.task('prettify-doc', function() {
  return gulp.src(docs.dir + '/*.html')
    .pipe(tap(function(file) {
      var $ = cheerio.load(file.contents.toString());
      var filename = file.path.slice(file.base.length);
      var className = filename.split('.html')[0];
      var div;

      // Prefix public constructors.
      if (docs.publicConstructors.indexOf(className) > -1) {
        div = $('.container-overview');
        var name = $('h4.name', div);
        name.html(name.html().replace(/new /, 'new <span style="color: #999">Twilio.Notification.</span>'));
      }

      // Remove private constructors.
      if (docs.privateConstructors.indexOf(className) > -1) {
        div = $('.container-overview');
        $('h2', div).remove();
        $('h4.name', div).remove();
        $('div.description', div).remove();
        $('h5:contains(Parameters:)', div).remove();
        $('table.params', div).remove();
      }

      file.contents = new Buffer($.html());
      return file;
    }))
  .pipe(gulp.dest(docs.dir));

});

gulp.task('doc', function(done) {
  runSequence('generate-doc', 'prettify-doc', done);
});

gulp.task('clean', function() {
  return del([
    product.packaged.dir + '/' + product.packaged.name,
    product.packaged.dir + '/' + product.packaged.minified,
    docs.dir,
    product.bundled.dir + '/' + product.bundled.name
  ]);
});

gulp.task('default', function(done) {
  runSequence(
    'clean',
    'lint',
    'unit-test',
    'build',
    'package',
    'doc',
    done
  );
});

