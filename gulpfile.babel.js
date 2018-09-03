import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import browserSync from 'browser-sync';
import del from 'del';
import {stream as wiredep} from 'wiredep';
import imageminMozjpeg from 'imagemin-mozjpeg';

const $ = gulpLoadPlugins();
const reload = browserSync.reload;
const mainNPMFiles = require('npmfiles');
const path = require('path');

const PRODUCTION = process.env.CONTEXT === 'production';
const CACHE_DIR = PRODUCTION ? path.resolve(process.env.NETLIFY_BUILD_BASE, 'cache', 'imagescache') : path.resolve(__dirname, 'node_modules/.cache');

gulp.task('styles', () => {
  return gulp.src('app/styles/*.scss')
    .pipe($.plumber())
    .pipe($.sass.sync({
      outputStyle: 'expanded',
      precision: 10,
      includePaths: ['.']
    }).on('error', $.sass.logError))
    .pipe($.autoprefixer({browsers: ['> 1%', 'last 2 versions', 'Firefox ESR']}))
    .pipe(gulp.dest('.tmp/styles'))
    .pipe(reload({stream: true}));
});

function lint(files, options) {
  return () => {
    return gulp.src(files)
      .pipe(reload({stream: true, once: true}))
      .pipe($.eslint(options))
      .pipe($.eslint.format())
      .pipe($.if(!browserSync.active, $.eslint.failAfterError()));
  };
}

const testLintOptions = {
  env: {
    mocha: true
  }
};

const lintOptions = {
  globals: [
    '$'
  ]
};

gulp.task('lint', lint('app/scripts/**/*.js', lintOptions));
gulp.task('lint:test', lint('test/spec/**/*.js', testLintOptions));

gulp.task('htmlinclude', () => {
  return gulp.src('app/templates/**/*.html')
    .pipe($.fileInclude({}))
    .pipe(gulp.dest('app'));
});

gulp.task('html', ['styles', 'htmlinclude'], () => {
  return gulp.src(['app/**/*.html', '!app/templates/*.html', '!app/includes/*.html'])
    .pipe($.useref({searchPath: ['.tmp', 'app', '.']}))
    .pipe($.if('*.js', $.uglify({compress: {drop_console: true}})))
    .pipe($.if('*.css', $.cssnano({discardComments: {removeAll: true}, safe: true})))
    .pipe($.if('*.html', $.htmlmin({
      collapseBooleanAttributes: true,
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: {compress: {drop_console: true}},
      conservativeCollapse: true,
      removeAttributeQuotes: true,
      removeCommentsFromCDATA: true,
      removeEmptyAttributes: true,
      removeOptionalTags: true,
      removeRedundantAttributes: true,
      useShortDoctype: true,
      processScripts: ['application/ld+json'],
      removeComments: true
    })))
    .pipe(gulp.dest('.tmp/dist'));
});

gulp.task('rev', ['html', 'images'], () => {
  return gulp.src(['.tmp/dist/**', '!**/Thumbs.db'])
    .pipe($.revAll.revision({
      dontRenameFile: ['.html', /^\/favicon\..*$/g, 'history.json', /^.*\/history\/.*$/g, '/images/logo.png'],
      dontUpdateReference: ['.html', '/images/logo.png'],
      transformPath: rev => {
        if (rev.startsWith('/')) {
          return rev;
        }
        return '/' + rev;
      }
    }))
    .pipe(gulp.dest('dist'));
});

gulp.task('image-resize-gallery-thumbnails', () => {
  return gulp.src('app/images/gallery/originals/**/*.{jpg,png}')
    .pipe($.changed(CACHE_DIR + '/images-resize/images/gallery/thumbnails'))
    .pipe($.imageResize({
      height: 180
    }))
    .pipe(gulp.dest(CACHE_DIR + '/images-resize/images/gallery/thumbnails'));
});

gulp.task('image-resize-poster', () => {
  return gulp.src('app/images/poster/**/*.{jpg,png}')
    .pipe($.changed(CACHE_DIR + '/images-resize/images/poster/thumbnails'))
    .pipe($.imageResize({
      height: 180
    }))
    .pipe(gulp.dest(CACHE_DIR + '/images-resize/images/poster/thumbnails'));
});

gulp.task('image-resize-gallery', () => {
  return gulp.src('app/images/gallery/originals/**/*.{jpg,png}')
    .pipe($.changed(CACHE_DIR + '/images-resize/images/gallery/resized'))
    .pipe($.imageResize({
      width: 1920,
      height: 1080
    }))
    .pipe(gulp.dest(CACHE_DIR + '/images-resize/images/gallery/resized'));
});

gulp.task('image-resize-cds', () => {
  return gulp.src('app/images/cds/*.jpg')
    .pipe($.changed(CACHE_DIR + '/images-resize/images/cds/thumbnails'))
    .pipe($.imageResize({
      height: 180
    }))
    .pipe(gulp.dest(CACHE_DIR + '/images-resize/images/cds/thumbnails'));
});

gulp.task('image-resize-history-thumbnails', () => {
  return gulp.src('app/images/history/originals/*.{jpg,png,gif}')
    .pipe($.changed(CACHE_DIR + '/images-resize/images/history/thumbnails'))
    .pipe($.imageResize({height: 32, width: 32}))
    .pipe(gulp.dest(CACHE_DIR + '/images-resize/images/history/thumbnails'));
});

gulp.task('image-resize-history', () => {
  return gulp.src('app/images/history/originals/*.{jpg,png,gif}')
    .pipe($.changed(CACHE_DIR + '/images-resize/images/history/resized'))
    .pipe($.imageResize({
      width: 1920,
      height: 1080
    }))
    .pipe(gulp.dest(CACHE_DIR + '/images-resize/images/history/resized'));
});

gulp.task('image-resize', ['image-resize-gallery-thumbnails', 'image-resize-poster',
  'image-resize-gallery', 'image-resize-cds', 'image-resize-history-thumbnails', 'image-resize-history']);

gulp.task('imagemin', ['image-resize'], () => {
  return gulp.src(['app/images/**/*.{jpg,png,gif,jpeg}', CACHE_DIR + '/images-resize/images/**/*.{jpg,png,gif,jpeg}', '!app/images/{gallery,history}/originals/**/*.*'])
    .pipe($.changed(CACHE_DIR + '/images-min'))
    .pipe($.cache($.imagemin([
      $.imagemin.jpegtran({progressive: true}),
      $.imagemin.optipng({optimizationLevel: 5})
    ], {})))
    .pipe(gulp.dest(CACHE_DIR + '/images-min'));
});

gulp.task('images', ['imagemin'], () => {
  return gulp.src(CACHE_DIR + '/images-min/**')
    .pipe(gulp.dest('.tmp/dist/images'));
});

gulp.task('extras', () => {
  gulp.src([
    'app/*.*',
    'app/CNAME',
    'app/_redirects',
    '!app/*.html',
    '!**/Thumbs.db'
  ], {
    dot: true
  }).pipe(gulp.dest('dist'));
  gulp.src('node_modules/apache-server-configs/dist/.htaccess')
    .pipe(gulp.dest('dist'));
  gulp.src('node_modules/@bower_components/blueimp-gallery/img/*.*')
    .pipe(gulp.dest('dist/img'));
  gulp.src('app/images/poster/workshop*.pdf')
    .pipe(gulp.dest('dist/images/poster'));
  return gulp.src('node_modules/@bower_components/TimelineJS3/compiled/{js,css}/**/*', {base: 'node_modules/@bower_components/'})
    .pipe(gulp.dest('dist/bower_components'));
});

gulp.task('clean', (cb) => {
  $.cache.clearAll();
  return del(['.tmp', 'dist', 'app/*.html', 'app/images/**/thumbnails/*',
    'app/images/**/resized/*', 'app/cds/*.html', 'app/contact/*.html', 'app/gallery/*.html',
    'app/history/*.html', 'app/imprint/*.html', 'app/songs/*.html'], cb);
});

gulp.task('json-minify', () => {
  return gulp.src('app/history/*.json')
    .pipe($.jsonminify())
    .pipe(gulp.dest('dist/history/'));
});

gulp.task('serve', ['styles', 'htmlinclude', 'image-resize'], () => {
  browserSync({
    notify: false,
    port: 9000,
    server: {
      baseDir: ['.tmp', 'app'],
      routes: {
        '/bower_components': 'node_modules/@bower_components'
      }
    }
  });

  gulp.watch('app/templates/**/*.html', ['htmlinclude']);

  gulp.watch([
    'app/*.html',
    'app/scripts/**/*.js',
    'app/images/**/*'
  ]).on('change', reload);

  gulp.watch('app/styles/**/*.scss', ['styles']);
  gulp.watch('package.json', ['wiredep']);
});

gulp.task('serve:dist', () => {
  browserSync({
    notify: false,
    port: 9000,
    server: {
      baseDir: ['dist']
    }
  });
});

gulp.task('serve:test', () => {
  browserSync({
    notify: false,
    port: 9000,
    ui: false,
    server: {
      baseDir: 'test',
      routes: {
        '/scripts': 'app/scripts',
        '/bower_components': 'node_modules/@bower_components'
      }
    }
  });

  gulp.watch('test/spec/**/*.js').on('change', reload);
  gulp.watch('test/spec/**/*.js', ['lint:test']);
});

// inject bower components
gulp.task('wiredep', () => {
  gulp.src('app/styles/*.scss')
    .pipe(wiredep({
      ignorePath: /^(\.\.\/)+/
    }))
    .pipe(gulp.dest('app/styles'));

  gulp.src('app/**/*.html')
    .pipe(wiredep({
      exclude: ['bootstrap-sass'],
      ignorePath: /^(\.\.\/)*\.\./
    }))
    .pipe(gulp.dest('app'));
});

gulp.task('sitemap', ['rev'], () => {
  return gulp.src(['dist/**/*.html', '!dist/imprint/**', '!dist/templates/**', '!dist/includes/**',
    '!dist/bower_components/**', '!dist/{contact,imprint}.html'])
    .pipe($.sitemap({
      siteUrl: 'https://www.gospel-people.de',
      changefreq: 'weekly',
      getLoc: function (siteUrl, loc, entry) {
        return loc.replace(/(.*)\.html/, '$1');
      }
    }))
    .pipe(gulp.dest('dist'));
});

console.log('Cache-Dir: ' + CACHE_DIR);

gulp.task('build', ['lint', 'rev', 'extras', 'sitemap', 'json-minify'], () => {
  return gulp.src('dist/**/*').pipe($.size({title: 'build', gzip: true}));
});

gulp.task('validate', () => {
  gulp.src('dist/*.html').pipe($.htmlValidator()).pipe(gulp.dest('.tmp/validate'));
});

gulp.task('default', $.sequence('clean', 'build'));

gulp.task('deploy', ['default'], () => {
  return gulp.src('dist/**/*')
    .pipe($.ghPages({branch: 'master'}));
});
