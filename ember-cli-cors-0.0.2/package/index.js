module.exports = {
  name: 'ember-cli-cors',

  config: function(environment /*, appConfig */) {
    return {};
  },

  serverMiddleware: function(config) {
    config.app.use(function(req, res, next) {
      res.setHeader('X-Inventarisierung-DEBUG', '01-ember-cli-cors');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      next();
    });
  }
};
