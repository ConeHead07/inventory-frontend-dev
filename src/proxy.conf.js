module.exports = {
  "/": {
    "secure": false,
    "bypass": (req, res, proxyOptions) => {
      res.setHeader("X-Developer", "Frank Barthold");
      res.setHeader("Access-Control-Allow-Origin", "*");
//      res.setHeader("Access-Control-Allow-Headers", "*");
//      res.setHeader("Access-Control-Allow-Methods", "*");
    }
  }
};
