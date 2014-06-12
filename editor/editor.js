
//i18n placeholder
function _t(s) { return s; }


var dialog = require('./dialog');
var Splash = require('./splash');
var DOMParser = require('../vendor/DOMParser');
var utils = require('./utils');


var TEMPLATE_LIST =  [{
    title: 'slides',
    description: 'Display visualization chapters like slides in a presentation',
    default: '```\n-title: \"A Shirt\'s Journey\"\n-author: \"CartoDB Team\"\n```\n\n#PICKING \n```\n- center: [33.0547, -89.2639]\n- zoom: 6\n```\n![](http://upload.wikimedia.org/wikipedia/commons/f/fd/Baumwoll-Erntemaschine_auf_Feld.jpeg)\nThe first stop on a cotton shirt\'s journey is often the Mississippi River Delta in the United States. Government subsidies, high tech equipment, and consistent quality make US cotton the prefered kind for many manufacturers.\n\n#SPINNING\n```\nL.marker([-6.1187, -253.1909]).actions.addRemove(S.map)\n- center: [0.1099, -255.3003]\n- zoom: 5\n```\n![](http://upload.wikimedia.org/wikipedia/commons/9/98/Jakarta.jpg)\nThe cotton is shipped over 10,000 miles to cities like Jakarta, Indonesia, where it can quickly and cheaply spun in to yarn (thread) that can be shipped elsewhere to be woven in to shirts, socks, or anything else!\n\n#WEAVING\n```\nL.marker([23.3826, -269.4946]).actions.addRemove(S.map)\n- center: [19.9320, -276.8555]\n- zoom: 5\n```\n![](http://cdn.morguefile.com/imageData/public/files/d/dzz/preview/fldr_2008_11_11/file0001368370777.jpg)\nOnce the yarn is spun, it is sent to cities like Dhaka, Bangladesh, where it is woven in to its final product.\n\n\n\n#PRINTING\n```\nL.marker([40.9384, -433.9270]).actions.addRemove(S.map)\n- center: [40.3214, -437.9919]\n- zoom: 6\n```\n![](http://cdn.morguefile.com/imageData/public/files/k/kconnors/preview/fldr_2012_04_12/file4101334264933.jpg)\nOnce the shirt is made, it is often sent to cities like New York, where it is screen printed with designs, or sold as-is. Round trip, that\'s over 20,000 miles for one shirt!\n\n#REUSING\n```\nL.marker([0.3076, -327.4008]).actions.addRemove(S.map)\n- center: [0.4834, -326.1621]\n- zoom: 5\n```\n\n![](http://upload.wikimedia.org/wikipedia/commons/3/3b/NakaseroMarket.jpg)\nUsed shirts often end up in charity bins. These charities often ship their used clothes collections off to cities like Kampala, Uganda, where they end up in crowded second-hand markets.'
  }, {
    title: 'scroll',
    description: 'Create a visualization that changes as your reader moves through your narrative',
    default: '```\n-title: "Title"\n-author: "Name"\n-baseurl: "http://{s}.api.cartocdn.com/base-light/{z}/{x}/{y}.png"\n```\n\n#title\n##headline\n\n#slide1\nsome text\n\n\n#slide2\nmore text'
  }, {
    title: 'torque',
    description: 'Link story elements to moments in time using this animated map template',
    default: '```\n-title: "Title"\n-author: "Name"\n-vizjson: "http://viz2.cartodb.com/api/v2/viz/521f3768-eb3c-11e3-b456-0e10bcd91c2b/viz.json"\n-duration: 30\n-baseurl: "http://{s}.api.cartocdn.com/base-light/{z}/{x}/{y}.png"\n```\n\n#title\n##headline\n\n#slide1\n```\n-step: 100\n```\nsome text\n\n\n#slide2\n```\n-step: 200\n```\nmore text'
  }
];





function editor(callback) {

  var body = d3.select(document.body);
  var context = {};

  d3.rebind(context, d3.dispatch('error', 'template_change'), 'on', 'error', 'template_change');

  context.templates = function(_) {
    if (_) {
      var t = TEMPLATE_LIST.map(function(d) { return d.title; }).indexOf(_);
      if (t >= 0) {
        return TEMPLATE_LIST[t];
      }
      return null;
    }
    return TEMPLATE_LIST;
  };

  context.save = utils.debounce(function(_) {
    if (this.code() && this.template()) {
      O.Template.Storage.save(this.code(), this.template());
    }
  }, 100, context);

  context.template = function(_) {
    if (_) {
      if (this._template !== _) {
        this._template = _;
        this.template_change(_);
      }
    }
    return this._template;
  }

  context.code = function(_) {

    if (_) {
      this._code = _;
      console.log("code", _);
    }
    return this._code;
  }

  var template = body.select('#template');
  var code_dialog = dialog(context);

  var iframeWindow;
  var $editor = body.append('div')
    .attr('id', 'editor_modal')
    .call(code_dialog);


  d3.select(document.body);

  var callbacks = {};

  function readMessage() {
    var msg = JSON.parse(event.data);

    if (msg.id) {
      callbacks[msg.id](msg.data);
      delete callbacks[msg.id];
    }
  }

  if (!window.addEventListener) {
    window.attachEvent("message", function load(event) {
      readMessage();
    });
  } else {
    window.addEventListener("message", function load(event) {
      readMessage();
    });
  }

  function sendMsg(_, done) {
    var id = new Date().getTime();
    callbacks[id] = done;
    _.id = id;
    iframeWindow.postMessage(JSON.stringify(_), iframeWindow.location);
  }

  function execCode(_, done) {
    var id = new Date().getTime();
    callbacks[id] = done;
    iframeWindow.postMessage(JSON.stringify({
      type: 'code',
      code: _,
      id: id
    }), iframeWindow.location);
  }

  function sendCode(_) {
    sendMsg({
      type: 'md',
      code: _
    }, function(err) {
      if (err) {
        err = [err]
      } else {
        err = []
      }
      context.error(err);
    });
  }

  function getAction(_, done) {
    sendMsg({ type: 'get_action', code: _ }, done);
  }

  function changeSlide(_) {
    sendMsg({ type: 'change_slide', slide: _ });
  }

  code_dialog.on('code.editor', function(code) {
    sendCode(code);
    context.code(code);
    context.save();
  });

  context.sendCode = sendCode;
  context.execCode = execCode;
  context.actions = function(_) {
    if (!arguments.length) return this._actions;
    this._actions = _;
    return this;
  };
  context.getAction = getAction;
  context.changeSlide = changeSlide;


  template.on('load', function() {
    iframeWindow = template.node().contentWindow;
    O.Template.Storage.load(function(md, template) {
      sendCode(md);
      set_template(template);

      if (template === 'torque') {
        if (md.indexOf('vizjson:') === -1) {
          var iviz = md.lastIndexOf('```'),
              viz = "-vizjson: \"http://viz2.cartodb.com/api/v2/viz/521f3768-eb3c-11e3-b456-0e10bcd91c2b/viz.json\"\n";

          md = md.slice(0, iviz) + viz + md.slice(iviz);
        }

        if (md.indexOf('duration:') === -1) {
          var idur = md.lastIndexOf('```'),
              dur = "-duration: \"30\"\n";

          md = md.slice(0, idur) + dur + md.slice(idur);
        }
      }

      $editor.call(code_dialog.code(md));
    });
    sendMsg({ type: 'actions' }, function(data) {
      context.actions(data);
    });

    // when there is no code, show template selector splash
    if (!context.code() && location.hash.length === 0) {
      d3.select(document.body).call(Splash(context).on('template', function(t) {
        var template_data = context.templates(t);
        if (template_data) {
          context.code(template_data.default);
          set_template(t);
          sendCode(template_data.default);
          $editor.call(code_dialog.code(template_data.default));
        }
      }));

      callback && callback();
    }
  });

  function set_template(t) {
    var html_url = t + ".html";
    if (template.attr('src') !== html_url) {
      template.attr('src', t + ".html");
      context.template(t);
      context.save();
    }
  }

  code_dialog.on('template.editor', function(t) {
    set_template(t);
  });

  //set_template('scroll');

}

module.exports = editor;
