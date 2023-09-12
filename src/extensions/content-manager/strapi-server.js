module.exports = (plugin) => {
  let originalCreate = plugin.controllers['collection-types'].create;
  let originalUpdate = plugin.controllers['collection-types'].update;
  plugin.controllers['collection-types'].create = (ctx) => {
    let { body } = ctx.request;
    if (body?.questions) {
      body.questionsOverwrite = body.questions;
    }
    return originalCreate(ctx);
  };
  plugin.controllers['collection-types'].update = (ctx) => {
    let { body } = ctx.request;
    if (body?.questions) {
      body.questionsOverwrite = body.questions;
    }
    return originalUpdate(ctx);
  };

  return plugin;
};
