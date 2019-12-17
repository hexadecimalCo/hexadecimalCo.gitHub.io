var gulp = require("gulp");
var $ = require("gulp-load-plugins")();
var autoprefixer = require("autoprefixer");
var browserSync = require("browser-sync").create();
var minimist = require("minimist");
var changed = require("gulp-changed");
var gulpSequence = require("gulp-sequence").use(gulp);

// production || development
// # gulp --env production
var envOptions = {
  string: "env",
  default: { env: "development" }
};
var options = minimist(process.argv.slice(2), envOptions);
console.log(options);

gulp.task("clean", function() {
  return gulp
    .src(["./dist"], { read: false }) // 選項讀取：false阻止gulp讀取文件的內容，使此任務更快。
    .pipe($.clean());
  cb(err);
});

//pug
gulp.task("pug", function buildHTML() {
  return gulp
    .src("./src/pug/**/*.pug")
    .pipe($.plumber()) //如果程式錯誤讓gulp繼續做下去
    .pipe(
      $.pug({
        pretty: true
      })
    )
    .pipe(gulp.dest("./dist/"))
    .pipe(
      browserSync.reload({
        stream: true
      })
    );
});

//sass
gulp.task("sass", function() {
  var plugins = [autoprefixer({ browsers: ["last 2 version", ">5%"] })];
  return (
    gulp
      .src("./src/sass/**/*.sass")
      .pipe($.plumber()) //如果程式錯誤讓gulp繼續做下去
      .pipe($.sourcemaps.init())
      .pipe($.sass().on("error", $.sass.logError))
      //編譯完成css
      .pipe($.postcss(plugins))
      .pipe($.if(options.env === "production", $.minifyCss())) // 假設開發環境則壓縮 CSS
      .pipe($.sourcemaps.write("."))
      .pipe(gulp.dest("./dist/css"))
      .pipe(
        browserSync.reload({
          stream: true
        })
      )
  );
});

//babel
gulp.task("js", () => {
  return gulp
    .src("./src/js/*.js")
    .pipe($.sourcemaps.init())
    .pipe($.concat("app.js"))
    .pipe(
      $.babel({
        presets: ["es2015"]
      })
    )
    .pipe(
      $.if(
        options.env === "production",
        $.uglify({
          compress: {
            drop_console: true
          }
        })
      )
    )
    .pipe($.sourcemaps.write("."))
    .pipe(gulp.dest("./dist/js"))
    .pipe(
      browserSync.reload({
        stream: true
      })
    );
});

//browser-sync$.
gulp.task("browser-sync", function() {
  browserSync.init({
    server: {
      baseDir: "./dist" //在dist的資料夾打開
    }
  });
});

//image
gulp.task("img", function() {
  gulp
    .src("./src/img/*")
    .pipe($.plumber())
    .pipe(changed("./dist/img"))
    .pipe($.if(options.env === "production", $.imagemin()))
    .pipe(gulp.dest("./dist/img"));
});

//監控資料當檔案有更變，自動把pug轉html
gulp.task("watch", function() {
  gulp.watch("./src/sass/**/*.sass", ["sass"]);
  gulp.watch("./src/pug/**/*.pug", ["pug"]);
  gulp.watch("./src/js/**/*.js", ["js"]);
  gulp.watch("./src/img/**", ["img"]);
});

gulp.task("default", ["pug", "sass", "js", "img", "browser-sync", "watch"]);
