/*
 * Copyright (C) 2015 Kaj Magnus Lindberg
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/// <reference path="../../typedefs/react/react.d.ts" />
/// <reference path="../../typedefs/moment/moment.d.ts" />
/// <reference path="../plain-old-javascript.d.ts" />
/// <reference path="../editor/commonmark.ts" />
/// <reference path="../ReactStore.ts" />
/// <reference path="../Server.ts" />

//------------------------------------------------------------------------------
   module debiki2.admin {
//------------------------------------------------------------------------------

var d = { i: debiki.internal, u: debiki.v0.util };
var r = React.DOM;
var reactCreateFactory = React['createFactory'];
var ReactBootstrap: any = window['ReactBootstrap'];
var Button = reactCreateFactory(ReactBootstrap.Button);


export var ReviewAllPanelComponent = React.createClass({
  mixins: [SaveSettingMixin],

  componentDidMount: function() {
    var loading = Server.loadEditorEtceteraScripts();
    Server.loadReviewTasks(reviewTasks => {
      loading.done(() => {
        this.setState({ reviewTasks: reviewTasks });
      });
    });
  },

  render: function() {
    if (!this.state)
      return r.p({}, 'Loading...');

    var now = Date.now();
    var elems = this.state.reviewTasks.map((reviewTask: ReviewTask) => {
      return ReviewTask({ reviewTask: reviewTask, now: now, key: reviewTask.id });
    });

    return (
      r.div({},
        elems));
  }
});


// For now. Don't want to rerender.
var safeHtmlByMarkdownSource = {};


var ReviewTask = createComponent({
  getInitialState: function() {
    return {};
  },

  formatWhatAndWhys: function() {
    var reviewTask: ReviewTask = this.props.reviewTask;
    var what = "The post below ";
    var whys = [];

    var who;
    if (ReviewReasons.isByNewUser(reviewTask)) {
      who = "a new user";
      if (ReviewReasons.isByThreatUser(reviewTask)) {
        who += "that sometimes misbehaves";
      }
    }
    else if (ReviewReasons.isByThreatUser(reviewTask)) {
      who = "a user that sometimes misbehaves";
    }

    if (ReviewReasons.newPost(reviewTask) && who) {
      whys.push("was posted by " + who);
    }

    if (ReviewReasons.noBumpPost(reviewTask)) {
      whys.push("was posted on a closed page, it might have gone unnoticed");
    }

    if (ReviewReasons.edit(reviewTask) && who) {
      whys.push("was edited by " + who);
    }
    if (ReviewReasons.lateEdit(reviewTask)) {
      whys.push("was edited long after it was created, no one might have noticed");
    }

    if (ReviewReasons.postFlagged(reviewTask)) {
      whys.push("has been flagged");
    }
    if (ReviewReasons.postUnpopular(reviewTask)) {
      whys.push("is unpopular (many downvotes)");
    }

    /* Later, when reviewing user profiles:
    This user is a new user, and sometimes misbehaves, and:
      was just created
      changed his/her avatar
      changed his/her name
      changed his/her about text */

    return [what, whys];
  },

  openPostInNewTab: function() {
    var post = this.props.reviewTask.post;
    var url = '/-'+ post.pageId +'#post-'+ post.nr;
    window.open(url, '_blank');
  },

  completeReviewTask: function() {
    var revisionNr = (this.props.reviewTask.post || {}).currRevNr;
    Server.completeReviewTask(this.props.reviewTask.id, revisionNr, () => {
      this.setState({ completed: true });
    });
  },

  render: function() {
    var state = this.state;
    var reviewTask: ReviewTask = this.props.reviewTask;

    var whatAndWhys = this.formatWhatAndWhys();
    var what = whatAndWhys[0];
    var whys = whatAndWhys[1];

    var post = reviewTask.post;

    var openPostButton = Button({ onClick: this.openPostInNewTab }, "Open in new tab");

    // For now:
    var doneButton;
    if (this.state.completed || reviewTask.completedAtMs) {
      doneButton = r.span({}, " Has been reviewed already.");
    }
    else if (reviewTask.invalidatedAtMs) {
      // Hmm could improve on this somehow.
      doneButton = r.span({}, "Invalidated, perhaps the post was deleted?");
    }
    else {
      doneButton = Button({ onClick: this.completeReviewTask }, "I'm done reviewing it");
    }

    var safeHtml;
    if (0 && post.currRevNr === post.approvedRevNr) {
      safeHtml = post.approvedHtmlSanitized;
    }
    else {
      // Need to render CommonMark source to html.
      // COULD create some markdown cache? Useful elsewhere too?
      // Or use React's shouldComponentUpdate().
      safeHtml = safeHtmlByMarkdownSource[post.currentSource];
      if (!safeHtml) {
        safeHtml = editor.markdownToSafeHtml(post.currentSource);
        safeHtmlByMarkdownSource[post.currentSource] = safeHtml;
      }
    }

    var colon = whys.length === 1 ? ':' : '';
    var manyWhysClass = whys.length > 1 ? ' esReviewTask-manyWhys' : '';
    var hereIsThePost = whys.length > 1 ? 'Here it is:' : '';

    return (
      r.div({ className: 'esReviewTask' + manyWhysClass },
        r.div({},
          r.span({ className: 'esReviewTask_what' }, what),
          r.ul({ className: 'esReviewTask_whys' },
            whys.map((why) => r.li({ key: why }, why))),
          colon),
        r.div({},
          hereIsThePost,
          r.div({ className: 'esReviewTask_it' },
            r.div({ dangerouslySetInnerHTML: { __html: safeHtml }}))),
        r.div({ className: 'esReviewTask_btns' },
          openPostButton,
          doneButton)));

    /* Later, something like?:

    What do you want to do?

    Leave as is / Approve it
      Looks fine, nothing is wrong with this post.

    Edit

    Send PM
      Sen a private message (PM) to the user if you want to ask him or her to change the post somehow.

    Delete

    View user
      On the user page, there's a button that deletes _all_ comments by this user.
      And you can ban him/her.
    */
  }
});



// COULD move to some debiki-common.js or debiki-utils.js?
function escapeHtml(html: string) {
  // See https://www.owasp.org/index.php/XSS_(Cross_Site_Scripting)_Prevention_Cheat, rule #1.
  // However, & < > should be enough, see: org.owasp.encoder.Encode.forHtmlContent().
  return html
   .replace(/&/g, "&amp;")
   .replace(/</g, "&lt;")
   .replace(/>/g, "&gt;");
}


//------------------------------------------------------------------------------
   }
//------------------------------------------------------------------------------
// vim: fdm=marker et ts=2 sw=2 tw=0 fo=r list