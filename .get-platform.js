const os = require("os");
const platform = os.platform() + "-" + os.arch();
console.log(platform);
