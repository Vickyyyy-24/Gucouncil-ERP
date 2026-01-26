const path = require("path");

const addonPath = path.join(__dirname, "build/Release/mantraaddon.node");
module.exports = require(addonPath);
