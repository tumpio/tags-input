
2.1.6 / 2017-06-03
==================

 * fix pattern support

2.1.5 / 2017-05-15
==================

 * transpile ES2015 to ES5 before publishing
 * switch from babel to buble

2.1.4 / 2017-02-17
==================

 * change name to @pirxpilot/tags-input

2.1.3 / 2016-12-06
==================

 * fix unnecessary saving when no new tag was added
 * no need for workaround for FF input.dispatchEvent bug
 * don't dispatch 'change' event when input field is merely being initialized

2.1.2 / 2016-12-02
==================

 * improve example / test
 * minor performance fixes

2.1.1 / 2016-12-02
==================

 * add workaround for FF input.dispatchEvent bug

2.1.0 / 2016-11-26
==================

 * add support for multiple separators

2.0.0 / 2016-11-25
==================

 * switch to browserify only builds
 * make separator configurable through `data-separator`
 * use flex instead of recalculating input width
 * preserve original input type - etc. 'edit' or 'url'
