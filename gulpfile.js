/*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*

    #Faster email
    @Author        Jonathan Dion / Clauderic Demers
    @Type          Javascript

  =*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*=*/

/*
    TODOS : livereload scss
*/

// modules
var gulp        = require('gulp'),
    inlineCss   = require('gulp-inline-css'),
    sass        = require('gulp-sass'),
   	plumber     = require('gulp-plumber'),
    concat      = require('gulp-concat'),
    inject      = require('gulp-inject-string');
    ejs         = require("gulp-ejs"),
    imagemin    = require('gulp-imagemin'),
    pngcrush    = require('imagemin-pngcrush'),
    cheerio     = require('gulp-cheerio'),
    zip         = require('gulp-zip'),
    html2txt    = require('gulp-html2txt'),
    prettify    = require('gulp-html-prettify'),
    clean       = require('gulp-clean'),
    rename      = require('gulp-rename'),
    argv        = require('yargs').argv,
    gulpif      = require('gulp-if'),
    runSequence = require('run-sequence').use(gulp),
    webserver   = require('gulp-webserver');

  // global vars
  var CONTENT = [];

// initialization
gulp.task('transform-email', function() {
    gulp.src('drop-your-email-here/index.html')
        .pipe(cheerio({
          run: function ($) {

            $('a').each(function () {
              var el = $(this),
                rilt = el.attr("target"),
                href = el.attr("href") + '-' + rilt;
              el.attr({
                "rilt": rilt,
                "href": href
              });
              el.removeAttr('target');
            });

            $('td').each(function() {
                var el = $(this);
                el.removeAttr("rowspan");
                el.removeAttr("colspan");
            });

            $('img').each(function() {
                var el = $(this);

                if (el.attr("alt") && el.attr("alt").length > 0) {
                    CONTENT.push(el.attr("alt"));
                }

                if (el.attr('src').indexOf("spacer.gif") > -1 && el.attr('width') === "1") {
                    el.remove().closest("td").remove();
                }

            });


            var table = $("table").html();
            $("body, head").remove();
            $("html").replaceWith(table);

          }

        }))
        .pipe(inject.prepend('<% include ../src/_common/views/_header %>'))
        .pipe(inject.append('<% include ../src/_common/views/_footer %>'))
        .pipe(rename(function (path) {
          path.extname = ".ejs";
        }))
        .pipe(prettify({indent_char: ' ', indent_size: 2}))
        .pipe(gulp.dest('drop-your-email-here'));
});

/*
  Clean
*/
gulp.task('clean', function (src) {
    return gulp.src(argv.dev ? 'build/*' : 'drop-your-email-here/*',{read: false})
        .pipe(clean());
});


gulp.task('sass', function () {
      return gulp.src('src/scss/style.scss')
            .pipe(plumber())
            .pipe(sass({sourcemap: false, style: 'nested'}))
            .pipe(gulp.dest('build'));
});

gulp.task('images', function () {
    return gulp.src(
      [
        'src/_common/images/*',
        'drop-your-email-here/images/*'
      ])
        .pipe(imagemin({
            progressive: false,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngcrush()]
        }))
        .pipe(gulp.dest('build/images'));
});


gulp.task('ejs', function(){
    gulp.src("drop-your-email-here/index.ejs")
        .pipe(ejs())
        .pipe(gulp.dest('build/'));
});

gulp.task('server', function() {
    gulp.src('build')
      .pipe(webserver({
        livereload: false,
        directoryListing: false,
        open: true
      }));
});

gulp.task('html2txt', function(){
  gulp.src('src/text.html')
        .pipe(cheerio({
          run: function ($) {
            CONTENT.forEach(function(el,index) {
                $('.content').append("<span>" + el + "</span><br/>");
            });
        }
        }))
    .pipe(html2txt(400))
    .pipe(gulp.dest('build'));
});


gulp.task('zip', function () {
  return gulp.src(['build/**','!*/.DS_Store','!*/*.zip','!build/style.css'])
      .pipe(zip('Archive.zip'))
      .pipe(gulp.dest('build'));
});

gulp.task('head', function() {
    return gulp.src('build/index.html')
        .pipe(cheerio({
          run: function ($) {
            $('head').append('<link rel="stylesheet" href="build/style.css" />')
          }
        }))
        .pipe(gulp.dest('build/'));
});

gulp.task('inline', function() {
  setTimeout(function(){
    return gulp.src('build/index.html')
        .pipe(inlineCss({
            applyStyleTags: true,
            applyLinkTags: true,
            removeStyleTags: false,
            removeLinkTags: false
        }))
        .pipe(gulp.dest('build/'));
  }, 1000);

});

gulp.task('tasks', function(done) {
  if(argv.dev) {
    runSequence('clean','sass','transform-email','images','ejs','html2txt','head','inline','server');
  } else if(argv.prod) {
    runSequence('clean','zip');
  }
});

gulp.task('default', ['tasks']);
