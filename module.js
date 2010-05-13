// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Javascript functions for AMOS
 *
 * @package   local-amos
 * @copyright 2010 David Mudrak <david@moodle.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * @namespace Local amos namespace
 */
M.local_amos = M.local_amos || {};

/**
 * Configuration and resources holder
 */
M.local_amos.Y = {};

/**
 * Initialize JS support for the main translation page, called from view.php
 *
 * @param {Object} Y YUI instance
 */
M.local_amos.init_translator = function(Y) {
    M.local_amos.Y  = Y;

    var filter      = Y.one('#amosfilter');
    var translator  = Y.one('#amostranslator');

    // add select All / None links to the filter languages selector field
    var flng        = filter.one('#amosfilter_flng');
    var flngactions = filter.one('#amosfilter_flng_actions');
    var flnghtml    = '<a href="#" id="amosfilter_flng_actions_all">All</a>' +
                      ' / <a href="#" id="amosfilter_flng_actions_none">None</a>';
    flngactions.set('innerHTML', flnghtml);
    var flngselectall = filter.one('#amosfilter_flng_actions_all');
    flngselectall.on('click', function(e) { flng.all('option').set('selected', true); });
    var flngselectnone = filter.one('#amosfilter_flng_actions_none');
    flngselectnone.on('click', function(e) { flng.all('option').set('selected', false); });

    // add select All / None links to the filter components selector field
    var fcmp        = filter.one('#amosfilter_fcmp');
    var fcmpactions = filter.one('#amosfilter_fcmp_actions');
    var fcmphtml    = '<a href="#" id="amosfilter_fcmp_actions_all">All</a>' +
                      ' / <a href="#" id="amosfilter_fcmp_actions_none">None</a>';
    fcmpactions.set('innerHTML', fcmphtml);
    var fcmpselectall = filter.one('#amosfilter_fcmp_actions_all');
    fcmpselectall.on('click', function(e) { fcmp.all('option').set('selected', true); });
    var fcmpselectnone = filter.one('#amosfilter_fcmp_actions_none');
    fcmpselectnone.on('click', function(e) { fcmp.all('option').set('selected', false); });

    if (translator) {
        // make all translateable fields editable
        var translateable = translator.all('.translateable');
        translateable.on('click', M.local_amos.make_editable);
        // in case of missing strings, turn editing mode on by default
        var missing = translator.all('.committable.missing.translation');
        missing.each(function(cell) { M.local_amos.editor_on(cell); });
    }
}

/**
 * Make the event target editable translator cell
 *
 * @param {Y.Event} e
 */
M.local_amos.make_editable = function(e) {
    M.local_amos.editor_on(e.currentTarget, true);
}

/**
 * Turn editable translator table cell into editing mode
 *
 * @param {Y.Node} cell translator table cell
 * @param {Bool} focus shall the new editor get focus?
 */
M.local_amos.editor_on = function(cell, focus) {
    var Y           = M.local_amos.Y;
    var current     = cell.one('.translation-view');    // <div> with the current translation
    var stext       = current.get('text');
    var editor      = Y.Node.create('<textarea class="translation-edit">' + stext + '</textarea>');
    editor.on('blur', M.local_amos.editor_blur);
    cell.append(editor);
    if (focus) {
        editor.focus();
    }
    current.setStyle('display', 'none');
    Y.detach('click', M.local_amos.make_editable, cell);
}

/**
 * Turn editable translator table cell into display mode
 *
 * @param {Y.Node} cell translator table cell
 * @param {String} newtext or null to keep the current
 * @param {String} newclass or null to keep the current
 */
M.local_amos.editor_off = function(cell, newtext, newclass) {
    var Y = M.local_amos.Y;
    // set new properties of the cell
    if (newclass !== null) {
        cell.removeClass('translated');
        cell.removeClass('missing');
        cell.removeClass('staged');
        cell.addClass(newclass);
    }
    // set the new contents of the translation text and show it
    var holder = cell.one('.translation-view');    // <div> with the current translation
    if (newtext !== null) {
        holder.set('innerHTML', newtext);
    }
    holder.setStyle('display', null);
    // remove the editor
    var editor = cell.one('textarea.translation-edit');
    editor.remove();
    // make the cell editable again
    cell.on('click', M.local_amos.make_editable);
}

M.local_amos.editor_blur = function(e) {
    var Y           = M.local_amos.Y;
    var editor      = e.currentTarget;
    var cell        = editor.get('parentNode');
    var current     = cell.one('.translation-view');    // <div> with the current translation
    var oldtext     = current.get('text');
    var newtext     = editor.get('value');

    if (Y.Lang.trim(oldtext) == Y.Lang.trim(newtext)) {
        // no change
        M.local_amos.editor_off(cell, null, null);
    } else {
        editor.set('disabled', true);
        M.local_amos.submit(cell, editor);
    }
}

M.local_amos.submit = function(cell, editor) {
    var Y = M.local_amos.Y;

    // stop the IO queue so we can add to it
    Y.io.queue.stop();

    // configure the async request
    var uri = M.cfg.wwwroot + '/local/amos/saveajax.php';
    var cfg = {
        method: 'POST',
        data: 'stringid=' + cell.get('id') + '&text=' + encodeURIComponent(editor.get('value')) + '&sesskey=' + M.cfg.sesskey,
        on: {
            start   : M.local_amos.submit_start,
            success : M.local_amos.submit_success,
            failure : M.local_amos.submit_failure,
        },
        arguments: {
            cell: cell,
        }
    };

    // add a new async request into the queue
    Y.io.queue(uri, cfg);

    // re-start queue processing
    Y.io.queue.start();
}

/**
 * Callback function for IO transaction
 *
 * @param {Int} tid transaction identifier
 * @param {Object} outcome from server
 * @param {Mixed} args
 */
M.local_amos.submit_success = function(tid, outcome, args) {
    var Y = M.local_amos.Y;
    var cell = args.cell;

    try {
        outcome = Y.JSON.parse(outcome.responseText);
    } catch(e) {
        alert('AJAX error - can not parse response');
        return;
    }

    var newtext = outcome.text;
    M.local_amos.editor_off(cell, newtext, 'staged');
}

M.local_amos.submit_failure = function(tid, outcome, args) {
    alert('AJAX request failed: ' + outcome.status + ' ' + outcome.statusText);
}

M.local_amos.init_stage = function(Y) {
    M.local_amos.Y  = Y;

    Y.all('.stagewrapper form').on('submit', function(e) {
        if (!confirm('This can not be undone. Are you sure?')) {
            e.halt();
        }
    });
}
