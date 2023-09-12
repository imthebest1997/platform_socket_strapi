import MyNewWysiwyg from './extensions/components/Wysiwyg';

export default {
  bootstrap(app) {
    app.addFields({ type: 'wysiwyg', Component: MyNewWysiwyg });
  },
};
