
// Comments
const COMMENT_REGEX = [
  /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/gm, // /* */ , //
  /#[^\n]*/g, // #
  /<!--([\s\S]*?)-->/g // <!-- -->
];

export default COMMENT_REGEX;