/**
 * @fileOverview jquery.SPWidgets.js
 * jQuery plugin offering multiple Sharepoint widgets that can be used
 * for creating customized User Interfaces (UI).
 *  
 * @version 20130509065100
 * @author  Paul Tavares, www.purtuga.com, paultavares.wordpress.com
 * @see     http://purtuga.github.com/SPWidgets/
 * 
 * @requires jQuery.js {@link http://jquery.com}
 * @requires jQuery-ui.js {@link http://jqueryui.com}
 * @requires jquery.SPServices.js {@link http://spservices.codeplex.com}
 * 
 * Build Date:  May 09, 2013 - 06:51 PM
 * Version:     20130509065100
 * 
 */
;(function($){
    
    "use strict";
    /*jslint nomen: true, plusplus: true */
   
    /**
     * Namespace for all properties and methods
     * @name        pt
     * @namespace   pt
     * @memberOf    jQuery
     */
    try {
        if (!$.pt) {
            $.pt = {};
        }
    } catch (e) {
        $.pt = {};
    }
    
    if ($.pt._cache === undefined) {
    
        /**
         * Local cache of data that is unlikely to change during
         * the live of the page.
         */
        $.pt._cache = {};
    
    }
    
    $.SPWidgets             = {};
    $.SPWidgets.version     = "20130509065100";
    $.SPWidgets.defaults    = {};
    
    /**
     * Given an XML message as returned by the Sharepoint WebServices API,
     * this method will check if it contains an error and return a boolean
     * indicating that. 
     * 
     *  @return {Boolean} true|false
     * 
     */
    $.fn.SPMsgHasError = function() {
        
        var spErrCode   = $(this).find("ErrorCode"),
            response    = false;
        
        if ( !spErrCode.length ) {
            
            if ( $(this).find("faultcode").length ) {
                
                return true;
                
            } else {
                
                return false;
                
            }
            
        } 
        
        spErrCode.each(function(){
            
            if ( $(this).text() !== "0x00000000" ) {
                
                response = true;
                return false;
                
            }
            
        });
        
        return response;
        
    }; /* $.fn.SPMsgHasError() */
    
    /**
     *  Given a sharepoint webservices response, this method will
     *  look to see if it contains an error and return that error
     *  formated as a string.
     * 
     * PARAMS:
     * 
     *  -   none.
     * 
     * RETURN:
     * 
     * @return {String} errorMessage
     * 
     */
    $.fn.SPGetMsgError = function(){
        
        var xMsg  = $(this),
            error = "ERROR: Call to Sharepoint Web Services failed.";
        
        if (xMsg.find("ErrorCode").length) {
            
            error += "\n" + xMsg.find("ErrorCode:first").text() +
                    ": " + xMsg.find("ErrorText").text();
        
        } else if (xMsg.find("faultcode").length) {
            
            error += xMsg.find("faultstring").text() + 
                    "\n" + xMsg.find("errorstring").text();
            
        } else {
            
            error = "";
            
        }
        
        return error;
        
    }; /* $.fn.SPGetMsgError() */
    
    /**
     * An extreemly lightweight template engine for replacing
     * tokens in the form of {{name}} with values from an object
     * or a list (array) of objects
     * 
     * @param {Object} tmplt
     * @param {Object} data
     * 
     * @return {String} templated filled out
     * 
     */
    $.SPWidgets.fillTemplate = function(tmplt, data) {
        
        var opt = {},i,j,x,y,item;
        
        opt.response    = "";
        opt.template    = String($("<div/>").append(tmplt).html());
        opt.tokens      = opt.template.match(/(\{\{.*?\}\})/g);
        
        if (!$.isArray(data)) {
            
            data = [ data ];
            
        }
        
        if (opt.tokens !== null) {
            
            for(x=0,y=data.length; x<y; x++){
                
                item = opt.template;
                
                for(i=0,j=opt.tokens.length; i<j; i++){
                    
                    opt.tokens[i]   = opt.tokens[i].replace(/[\{\{\}\}]/g, "");
                    item            = item.replace(
                                        "{{" + opt.tokens[i] + "}}",
                                        data[x][ opt.tokens[i] ] );
                                    
                }
                
                opt.response += item;
                
            }
        
        }
        
        return opt.response;
        
    }; //end: $.SPWidgets.fillTemplate()
    
    
    /**
     * Parses a Sharepoint lookup values as returned by webservices
     * (id;#title;#id;#Title) into an array of objects.
     * 
     * @param {String} v
     *          Lookup items string as returned by SP webservices.
     * 
     * @return {Array}
     *          Array of objects. Each object has two keys; title and id 
     */
    $.SPWidgets.parseLookupFieldValue = function(v) {
        
        var r       = [],
            a       = String(v).split(';#'), 
            total   = a.length,
            i, n, t;
        
        if (v === undefined) {
            
            return r;
            
        }
        
        for (i=0; i<total; i++){
            
            n = a[i];
            i++;
            t = a[i];
            
            if (n || t) {
            
                r.push({ id: n, title: t });
            
            }
            
        }
        
        return r;
        
    }; //end: $.SPWidgets.parseLookupFieldValue
    
    
    /**
     * Given an array of CAML matches, this method will wrap them all in a
     * Logical condition (<And></And> or a <Or></Or>). 
     * 
     * @param {Object}  options
     *              Options for the call. See below.
     * @param {String}  options.type
     *              Static String. The type of logical condition that
     *              the 'values' should be wrapped in. Possible values
     *              are 'AND' or 'OR'.  Default is 'AND'.
     * @param {Array options.values
     *              The array of String elements that will be
     *              join into caml Logical condition.
     * @param {Function} [options.onEachValue=null]
     *              A function to process each items in the 'values'
     *              array. Function must return the value that should
     *              be used instead of the one found in the array. Use
     *              it to define the xml around each value
     *              (ex. <Eq><FieldRef>...</Eq>).
     *              Function is given 1 input param - the item currently
     *              being processed (from the 'values' input param).
     * 
     * @return {String} logical Query as a single string.
     * 
     * @example
     *   $.SPWidgets.getCamlLogical({
     *        type: "or",
     *        values: [
     *           "<Eq><FieldRef Name='Title' /><Value Type='Text'>Test</Value></Eq>",
     *           "<Eq><FieldRef Name='Title' /><Value Type='Text'>Test1</Value></Eq>",
     *           "<Eq><FieldRef Name='Title' /><Value Type='Text'>Test2</Value></Eq>",
     *           "<Eq><FieldRef Name='Title' /><Value Type='Text'>Test3</Value></Eq>",
     *           "<Eq><FieldRef Name='Title' /><Value Type='Text'>Test4</Value></Eq>"
     *        ]
     *      })
     *   
     *   
     *     Concatenate multiple calls to getCamlLogical():
     *   
     *     $.SPWidgets.getCamlLogical({
     *        type: "or",
     *        values: [
     *           "<Eq><FieldRef Name='ID' /><Value Type='Text'>10</Value></Eq>",
     *           "<Eq><FieldRef Name='ID' /><Value Type='Text'>15</Value></Eq>",
     *           $.SPWidgets.getCamlLogical({
     *              type: "and",
     *              values: [
     *                 "west",
     *                 "east"
     *              ],
     *              onEachValue: function(loc){
     *                 return "<Neq><FieldRef Name='Region'/><Value Type='Text'>" +
     *                         loc + "</Value></Neq>";
     *              }
     *          })
     *        ]
     *      })
     *   
     */
    $.SPWidgets.getCamlLogical = function(options){
        
        // FIXME: BUG: getCamlLogical() currently alters values array given on input.
        
        var o = $.extend(
                    {},
                    {   type:           "AND",
                        values:         [],
                        onEachValue:    null
                    },
                    options),
            tagOpen     = "<And>",
            tagClose    = "</And>",
            logical     = "",
            total       = 0,
            last        = 0,
            haveFn      = false,
            i;
        
        o.type = String(o.type).toUpperCase();
        
        if (!$.isArray(o.values)) {
            
            o.values = [o.values];
            
        }
        
        if (o.type !== "AND") {
            
            tagOpen     = "<Or>";
            tagClose    = "</Or>";
            
        }
        
        logical = tagOpen;
        total   = o.values.length;
        last    = (total - 1);
        haveFn  = $.isFunction(o.onEachValue);
        
        if (total < 2){
            
            logical = "";
            
        }
        
        for ( i=0; i<total; i++){
            if (haveFn) {
                logical += String(o.onEachValue(o.values[i])).toString();
            } else {
                logical += String(o.values[i]).toString();
            }
            if ((last - i) > 1){
                logical += $.SPWidgets.getCamlLogical(
                            $.extend({}, o, {
                                values: o.values.splice((i + 1), (total - i))
                            })
                        );
                break;
            }
        }
        
        if (total > 1){
            logical += tagClose;
        }
    
        return logical;
        
    };// $.SPWidgets.getCamlLogical()
    
    /**
     * Returns a date string in the format expected by Sharepoint
     * Date/time fields. Usefaul in doing filtering queries.
     * 
     * Credit:  Matt (twitter @iOnline247)
     *          {@see http://spservices.codeplex.com/discussions/349356}
     * 
     * @param {Date} [dateObj=Date()]
     * @param {String} [formatType='local']
     *              Possible formats: local, utc
     * 
     * @return {String} a date string.
     * 
     */
    $.SPWidgets.SPGetDateString = function( dateObj, formatType ) {
        
        formatType  = String(formatType || "local").toLowerCase();
        dateObj     = dateObj || new Date();
    
        function pad( n ) {
            
            return n < 10 ? '0' + n : n;
            
        }
        
        var ret = '';
        
        if (formatType === 'utc') {
            
            ret = dateObj.getUTCFullYear() + '-' +
                    pad( dateObj.getUTCMonth() + 1 ) + '-' +
                    pad( dateObj.getUTCDate() ) + 'T' +
                    pad( dateObj.getUTCHours() ) + ':' +
                    pad( dateObj.getUTCMinutes() )+ ':' +
                    pad( dateObj.getUTCSeconds() )+ 'Z';

        } else {
            
            ret = dateObj.getFullYear() + '-' +
                    pad( dateObj.getMonth() + 1 ) + '-' +
                    pad( dateObj.getDate() ) + 'T' +
                    pad( dateObj.getHours() ) + ':' +
                    pad( dateObj.getMinutes() )+ ':' +
                    pad( dateObj.getSeconds() );
            
        }
        
        return ret;
                
    }; //end: $.SPWidgets.SPGetDateString()
    
    /**
     * Make a set of element the same height by taking the height of
     * the longest element. 
     * 
     * @param {HTMLElement|Selector|jQuery} ele - Set of elements
     * @param {Interger} [pad=0]                - Number of pixels to add on to the height
     * 
     * @return {Object} ele (input param) is returned
     * 
     */
    $.SPWidgets.makeSameHeight = function(ele, pad) {
            
        var h = 0,
            e = $(ele);
        e.each(function(){
            
            var thisEle = $(this).css("height", "");
            
            if (h < thisEle.outerHeight(true)) {
                
                h = thisEle.outerHeight(true);
                
            }
            
        });
        
        if (h > 0) {
            
            if (pad) {
                
                h += pad;
                
            }
            
            e.height(h);
            
        }
        
        return ele;
        
    }; // end: Board.MakeSameHeight()
    
    
/**
 * Displays data from a list in Kan-Ban board using a specific column from
 * that list.  Column (at this point) is assume to be a CHOICE type of field.
 * 
 * Dependencies:
 * 
 *  -   jQuery-UI Draggable
 * 
 * 
 * BUILD: May 09, 2013 - 06:51 PM
 */

;(function($){

    "use strict";
    /*jslint nomen: true, plusplus: true */
    /*global SPWidgets */
    
    /**
     * @class 
     */
    var Board   = {};
    
    Board.initDone = false;
    
    /**
     * Board widget default options. 
     */
    $.SPWidgets.defaults.board = {
        list:           '',
        field:          '',
        CAMLQuery:      '<Query></Query>',
        CAMLViewFields: '',
        fieldFilter:    null,
        optionalLabel:  '(none)',
        template:       null,
        webURL:         $().SPServices.SPGetCurrentSite(),
        onGetListItems: null,
        onPreUpdate:    null,
        onBoardCreate:  null
    };
    
    /**
     * Given a selector, this method will insert a Kan-Ban board inside 
     * of it with data retrieved from a specific list.
     * This widget will retrieve the List definition upon first call
     * using SPServices and setting cache = true. In some implementations
     * it may be desirable to get these defintions ahead of calling this
     * widget so that a cached version is used.
     * 
     * @param {Object} options
     * 
     * @param {String} options.list
     *                  The list name or UID.
     * 
     * @param {String} options.field
     *                  The field from the List from where the board should
     *                  be built from. This field should be either of type
     *                  CHOICE or LOOKUP.
     * 
     * @param {String|Function} [options.CAMLQuery="<Query></Query>"]
     *                  String with CAML query to be used against the list
     *                  to filter what is displayed or a function that will
     *                  provide the list of items (an array). If defining
     *                  a Function, it will be given two input parameter:
     *                  1) a function that must be called and be given the
     *                  array of items.
     *                  2) The options defiend on input to this widget.
     *                  The user defined function will be given a scope
     *                  (this keyword) of the html element it was bound to.
     *                  Example:
     *                  options.CAMLQuery = '<Query><Where>\
     *                          <FieldRef Name="Project" />\
     *                          <Value Type="Text">Latin America</Value>\
     *                      </Where></Query>';
     *                  --or--
     *                  options.CAMLQuery = function(sendResults) {
     *                      //get items from DB
     *                      sendResults([...]);
     *                  }
     * 
     * @param {String} [options.CAMLViewFields=""]
     *                  String in CAML format with list of fields to be
     *                  returned from the list when retrieving the rows
     *                  to be displayed on the board. 
     * 
     * @param {String} [options.fieldFilter=""]
     *                  A string with either a comma delimetered list of
     *                  column values to show if field is of CHOICE type;
     *                  or a string with a CAML query to filter field values,
     *                  if field is of type Lookup
     *  
     * @param {String} [options.optionalLabel="(none)"]
     *                  The string to be used as the State column header when
     *                  field from where Board was built is optional in the
     *                  List. 
     * 
     * @param {String|Function|Element|jQuery} [options.template="<div></div>"]
     *                  The HTML template that will be used to for displaying
     *                  items on the board. The HTML will be used with jQuery's
     *                  .wrapInner() method and will use the Title field to
     *                  populate the inner nodes.
     *                  When defining a Function, it will be called with
     *                  a context of the item container on board that
     *                  should receive the content and be given two
     *                  input parameters: an object with the list item
     *                  and the original element that the board was bound
     *                  to.
     *                  Example:
     * 
     *                      function(listItem, board){
     *                          // this = jQuery - List Item container within the board.
     *                      } 
     * 
     * @param {String} [options.webURL=$().SPServices.SPGetCurrentSite()]
     *                  The WebURL for the list.
     * 
     * @param {Function} [options.onGetListItems=null]
     *                  Callback function to be called after data has been
     *                  retrieved from the 'list'. Function will be given a
     *                  scope (this) of the selection they used on input to
     *                  this method and two input parameters: 
     *                  An Array of Objects with the list of rows returned
     *                  from the List, and
     *                  A jQuery object representing the entire xml document
     *                  response.  Example:
     * 
     *                      onGetListItems: function(items, xmlResponse){
     *                          //this = jQuery element container selction
     *                      } 
     * 
     * @param {Function} [options.onPreUpdate=null]
     *                  Callback function to be called just prior to a List Item
     *                  update. The callback will have a scope of the item being
     *                  updated and be given 2 parameters:
     *                  1) the event object,
     *                  2) the item (DOM element) that triggered the event and 
     *                  3) a data object with information/methods for the current
     *                     item/widget binding. The object will include two
     *                     attributes that will impact the updates:
     *                      data.updates - An array of updates that will be made.
     *                          The array will have, to start, the update to the
     *                          state that was triggered by the move in the board.
     *                          Additional updates can be added.
     *                          Format will be identical to what SPServices uses:
     *                          ["field", "value"]. Example:
     *                          data.updates.push(["Title", "New title here"]);
     * 
     *                      data.updatePromise - A jQuery.Promise that represents
     *                          the update that will be made. This can be used to
     *                          bind on additional functionality. The queued functions
     *                          will be given the List Item object as well as the
     *                          xml resposne returned from the update. The context of
     *                          object will be the HTML element from where the update
     *                          was triggered.
     * 
     *                  The function should return a boolean indicating whether the
     *                  update should be canceled. True will cancel the update.
     *                  Example:
     * 
     *                      onPreUpdate: function(ev, item, data){
     *                          //this = jQuery element container selction
     *                      } 
     * 
     * @param {Function} [options.onBoardCreate=null]
     *                  Function triggered after board is initially created.
     *                  See spwidget:boardcreate even for parameters that
     *                  will be given to function.
     * 
     * 
     * @return {jQuery} this
     * 
     * 
     * @example
     * 
     *      $("#boardContainer").SPShowBoard({
     *          list:   "Tasks",
     *          field:  "Status"
     *      });
     * 
     * 
     * EVENTS TRIGGERED BY THIS PLUGIN:
     * 
     *  spwidget:boardchange,
     *  spwidget:boardcreate    -   Events triggered anytime a change happens
     *                              in the board or when the board is first created.
     *                              Event is provided 3 parameters
     *                              1) the event object,
     *                              2) the item (DOM element) that triggered
     *                                 the event and
     *                              3) a data object with information/methods for the current
     *                                 item/widget binding.  The objects's .updates attribute
     *                                 will contain an array of array's with the updates that
     *                                 will be made to the item.
     *                              The function's 'this'
     *                              variable will point to the column element that
     *                              received the new item.
     * 
     *                              Example:
     *                                  
     *                                  ele.on("spwidget:boardchange", function(ev, item, data){
     *                                      // this = ele;
     *                                  })
     *  
     * spwidget:boarditemadd    -   Event triggered when new items are added to the
     *                              board (ex. from a refresh). Event will be given
     *                              the following input params:
     *                              1) the event object (jquery)
     *                              2) the item (DOM element) that triggered
     *                                 the event and
     *                              3) a data object with information/methods for the current
     *                                 item/widget binding.  The objects's .itemsModified attribute
     *                                 will contain an array of Objects  that were added.
     * 
     * spwidget:boarditemremove -   Event triggered when items are removed from the
     *                              board (ex. from a refresh). Event will be given
     *                              the following input params:
     *                              1) the event object (jquery)
     *                              2) the board container (DOM element)
     *                              3) a data object with information/methods for the current
     *                                 item/widget binding.  The objects's .itemsModified attribute
     *                                 will contain an array of Objects that were removed.
     * 
     * 
     * 
     * 
     * AVAILABLE METHODS:
     * 
     *  refresh     -   Refreshes the data in the Board by retrieving the data
     *                  from the list again. During a refresh, existing board
     *                  items (the html element in DOM) is not actually deleted
     *                  and recreated if it already exists, but re-used. It is
     *                  important to note this specially if a custom template
     *                  function was defined as an input param.
     *  
     *                  $().SPShowBoard("refresh");
     *  
     * redraw       -   Redraws the board without pulling in data from the list.
     *                  Column heights will be normalized and jQuery UI's sortable
     *                  widget will be refreshed.
     * 
     *                  $().SPShowBoard("redraw");
     * 
     * 
     * // TODO: Destroy method (must remove all event bindings)
     * // TODO: move method - moves an item on the board (identified by ID) to
     *          a different state
     * 
     * 
     */
    $.fn.SPShowBoard = function(options){
        
        // TODO: need to determine how to page large datasets.
        
        // If initialization was not done yet, then do it now.
        // if the global styles have not yet been inserted into the page, do it now
        if (!Board.initDone) {
            
            Board.initDone = true;
            
            if (Board.styleSheet !== "") {
                
                $('<style type="text/css">' + "\n\n" +
                        Board.styleSheet + "\n\n</style>" )
                    .prependTo("head");
                
            }
            
        }
        
        return this.each(function(){
            
            var ele         = $(this),
                isMethod    = (typeof options === "string"),
                hasBoard    = ele.hasClass("hasSPShowBoard"),
                opt         = null,
                method      = '',
                board       = null;
            
            // if this element alraedy has a board on it, and
            // options is not a string, then exit.
            if ( hasBoard && !isMethod ) {
                
                return this;
            
            // Handle METHODS
            } else if (isMethod && hasBoard && !ele.hasClass("loadingSPShowBoard")) {
                
                method  = options.toLowerCase();
                board   = ele.data("SPShowBoardOptions");
                
                //*** REFRESH ***\\
                if (method === "refresh") {
                    
                    board._getListItems().then(function(){
                        board.showItemsOnBoard({ refresh: true });
                    });
                    
                //*** REDRAW ***\\
                } else if (method === "redraw") {
                    
                    board.statesCntr.find("div.spwidget-board-state").sortable("refresh");
                    $.SPWidgets.makeSameHeight( board.statesCntr.find("div.spwidget-board-state"), 20 );

                }//end: if(): methods
                
                return this;
                
            }//end: if()
            
            // If this element is already loading the UI, exit now
            if (ele.hasClass("loadingSPShowBoard")) {
            
                return this;
            
            }
            
            // Define this Widget instance
            opt = $.extend({},
                $.SPWidgets.defaults.board,
                options,
                {
                    states:             [], // List of states
                    statesMap:          {}, // Map of State->object in states[]
                    tmpltHeader:        '', // Header template
                    tmpltState:         '', // State item template
                    statesCntr:         '', // DOM element where rows are located
                    headersCntr:        '', // DOM element where headers are located
                    listItems:          [], // Array with items from the list.
                    initDone:           false,
                    formUrls:           null, // Object with url's to form. Used by opt.getListFormUrl()
                    isStateRequired:    true,
                    /**
                     * Populates the opt.stats and opt.statesMap by 
                     * pulling info. from the List definition
                     * 
                     * @return {jQuery.Promise}
                     * 
                     */
                    getBoardStates:     function(){
                        
                        return $.Deferred(function(dfd){
                                
                            // Get List information (use cached if already done in prior calls)
                            // and get list of States to build
                            $().SPServices({
                                operation:  "GetList",
                                listName:   opt.list,
                                cacheXML:   true,
                                async:      false,
                                webURL:     opt.webURL,
                                completefunc : function(xData, status) {
        
                                    // FIXME: need to handle errors
                                    // if (resp.hasSPError()) {
                                        // spAgile.logMsg({
                                            // type:   "error",
                                            // msg:    resp.getSPError()
                                        // });
                                        // return null;
                                    // }
                                    
                                    var resp    = $(xData.responseXML),
                                        f       = resp.find("Fields Field[StaticName='" + opt.field + "']");
                                    
                                    // If we did not find the field by internal name, try external.
                                    if (!f.length) {
                                        
                                        f = resp.find("Fields Field[DisplayName='" + opt.field + "']");
                                    
                                    }
                                    
                                    // store if field is required
                                    if ( f.attr("Required") === "FALSE" ) {
                                        
                                        opt.isStateRequired = false;
                                        
                                    }
                                    
                                    switch(f.attr("Type").toLowerCase()) {
                                        // CHOICE COLUMNS
                                        case "choice":
                                            
                                            // Should there be a blank column?
                                            if ( !opt.isStateRequired ) {
                                                
                                                opt.states.push({
                                                    type:   'choice',
                                                    title:  opt.optionalLabel,
                                                    name:   opt.optionalLabel
                                                });
                                                
                                                opt.statesMap[""] = opt.states[opt.states.length - 1];
                                                
                                            }
                                            
                                            if (opt.fieldFilter) {
                                                
                                                opt.fieldFilter = opt.fieldFilter.split(/\,/);
                                            
                                            }
                                            
                                            f.find("CHOICES CHOICE").each(function(){
                                                var thisChoice = $(this).text();
                                                
                                                // if there i sa filter and this column
                                                // is not part of it, exit now
                                                if (opt.fieldFilter) {
                                                    if (!$.grep(opt.fieldFilter, function(e){ return (e === thisChoice); }).length) {
                                                        return;
                                                    }
                                                }
                                                
                                                opt.states.push({
                                                    type:   'choice',
                                                    title:  thisChoice, // extenal visible
                                                    name:   thisChoice  // internal name
                                                });
                                                
                                                // Store State value in mapper (use internal name)
                                                opt.statesMap[thisChoice] = opt.states[opt.states.length - 1];
                                                
                                            });
                                            
                                            dfd.resolveWith(opt, [xData, status]);
                                            
                                            break;
                                            
                                        // LOOKUP COLUMNS
                                        case "lookup":
                                            
                                            if ( !opt.fieldFilter ) {
                                                
                                                opt.fieldFilter = "<Query></Query>";
                                                
                                            }
                                            
                                            // Query the lookup table and get the rows that
                                            // should be used to build the states
                                            $().SPServices({
                                                operation:      "GetListItems",
                                                listName:       f.attr("List"),
                                                async:          true,
                                                cacheXML:       true,
                                                CAMLQuery:      opt.fieldFilter,
                                                CAMLRowLimit:   0,
                                                CAMLViewFields: 
                                                    '<ViewFields>' +
                                                        '<FieldRef Name="' + 
                                                            f.attr("ShowField") + '" />' +
                                                    '</ViewFields>',
                                                completefunc:   function(xData, status){
                                                    
                                                    // Process Errors
                                                    if (status === "error") {
                                                        
                                                        dfd.rejectWith(
                                                                ele,
                                                                [ 'Communications Error!', xData, status ]);
                                                        
                                                        return;
                                                        
                                                    }
                                                    
                                                    var resp = $(xData.responseXML);
                                                    
                                                    if ( resp.SPMsgHasError() ) {
                                                         
                                                         dfd.rejectWith(
                                                                ele,
                                                                [ resp.SPGetMsgError(), xData, status ]);
                                                        
                                                        return;
                                                        
                                                    }
                                                    
                                                    // Should there be a blank column?
                                                    if ( !opt.isStateRequired ) {
                                                        
                                                        opt.states.push({
                                                            type:   'lookup',
                                                            title:  opt.optionalLabel,  // extenal visible
                                                            name:   ""                  // internal name
                                                        });
                                                        
                                                        opt.statesMap[""] = opt.states[opt.states.length - 1];
                                                        
                                                    }
                                                    
                                                    // Loop thorugh all rows and build the
                                                    // array of states.
                                                    resp.SPFilterNode("z:row").each(function(){
                                                        
                                                        var thisRow     = $(this),
                                                            thisId      = thisRow.attr("ows_ID"),
                                                            thisTitle   = thisRow.attr( "ows_" + f.attr("ShowField") ),
                                                            thisName    = thisId + ";#" + thisTitle; 
                                                            
                                                        
                                                        opt.states.push({
                                                            type:   'lookup',
                                                            title:  thisTitle,  // Extenal visible
                                                            name:   thisName    // internal name
                                                        });
                                                        
                                                        // Store State value in mapper (use internal name)
                                                        opt.statesMap[thisName] = opt.states[opt.states.length - 1];
                                                        
                                                    });
                                                    
                                                    
                                                    dfd.resolveWith(opt, [xData, status]);
                                                    
                                                    return;
                                                    
                                                } //end: completefunc
                                            });
                                            
                                            break;
                                            
                                    }
                                    
                                    return;
                                    
                                }//end: completefunc()
                            });//end: spservices 
                            
                        })
                        .promise();
                        
                    }, //end: getBoardStates()
                    
                    /**
                     * Retrieves the items from the list for display on the board.
                     * Method return a promise whose input param is an array of
                     * object.
                     * 
                     * @param {object} options
                     * 
                     * @return {jQuery.Promise} jQuery promise
                     * 
                     */
                    _getListItems:   function(){
                        
                        return $.Deferred(function(dfd){
                            
                            /**
                             * Resolves the Deferred object. 
                             * 
                             * @param {jQuery|Function} rawResponse
                             *              Raw response from teh call to get data.
                             *              is passed along to the user's onGetListItems()
                             *              callback. 
                             */
                            function resolveDeferred(rawResponse) {
                                            
                                // If a callback was defined for onGetListItems,
                                // then call it now
                                if ($.isFunction(opt.onGetListItems)) {
                                    
                                    opt.onGetListItems.call(
                                        ele, 
                                        opt.listItems, 
                                        rawResponse
                                    );
                                    
                                }
                                
                                dfd.resolveWith(ele, [opt.listItems]);
                                
                            } //end: resolveDeferred()
                            
                            // If CAMLQuery is a function, then call user'
                            // data retrieval method.
                            if ($.isFunction( opt.CAMLQuery )) {
                                
                                opt.CAMLQuery.call(
                                    ele,
                                    function(items){
                                        
                                        if ($.isArray(items)) {
                                            
                                            opt.listItems = items;
                                            resolveDeferred( opt.CAMLQuery );
                                        }
                                        
                                    },
                                    options );
                                
                            // ELSE, opt.CAMLQuery is not a function...
                            // call GetListItems operation.
                            } else {
                                
                                $().SPServices({
                                    operation:      "GetListItems",
                                    listName:       opt.list,
                                    async:          true,
                                    CAMLQuery:      opt.CAMLQuery,
                                    CAMLRowLimit:   0, // FIXME: SP data should be paged??
                                    CAMLViewFields: opt.CAMLViewFields,
                                    completefunc:   function(xData, status){
                                        
                                        // Process Errors
                                        if (status === "error") {
                                            
                                            dfd.rejectWith(
                                                    ele,
                                                    [ 'Communications Error!', xData, status ]);
                                            
                                            return;
                                            
                                        }
                                        
                                        var resp = $(xData.responseXML);
                                        
                                        if ( resp.SPMsgHasError() ) {
                                             
                                             dfd.rejectWith(
                                                    ele,
                                                    [ resp.SPGetMsgError(), xData, status ]);
                                            
                                            return;
                                            
                                        }
                                        
                                        // Store the list of items
                                        opt.listItems   = resp
                                                            .SPFilterNode("z:row")
                                                            .SPXmlToJson({
                                                                includeAllAttrs: true
                                                            });
                                        
                                        resolveDeferred( resp );
                                        
                                        
                                        
                                    }//end: completefunc()
                                });//end: SPServices
                                
                            } //end: else: do SPServices call
                            
                            
                            
                            
                        }).promise();
                        
                    }, //end: _getListItems()
                    
                    /**
                     * Given an ID, this method will return the data object
                     * for that item - the element retrieved during for
                     * display on the board.
                     * 
                     * @param {String|Interger}
                     * 
                     * @return {Object} Item Object
                     * 
                     */
                    getBoardItemDataObject: function(itemId){
                        
                        var itemObject = null,
                            x,y,id;
                        
                        if (itemId) {
                            
                            itemId = String(itemId);
                            
                            for(x=0,y=opt.listItems.length; x<y; x++){
                                
                                id = opt.listItems[x].ID;
                                
                                if ($.isFunction(id)) {
                                    
                                    id = opt.listItems[x].ID();
                                    
                                }
                                
                                id = String(id);
                                
                                if (itemId === id) {
                                    
                                    itemObject = opt.listItems[x];
                                    x = y + y;
                                    
                                }
                                
                            }
                            
                        }
                        
                        return itemObject;
                        
                    }, // end: pageSetup.getBoardItemDataObject
                    
                    
                    /**
                     * Shows the List items on the board. 
                     * 
                     * @param {Object} [options]
                     * 
                     * @param {Array} [options.rows=opt.listItems]
                     *              The rows to display on tehe board. Default
                     *              to list stored in opt.listItems.
                     * 
                     * @param {Boolean} [options.refresh=false]
                     *              If true, then items currently on the board
                     *              will not be erased; only new items will be
                     *              added and invalid item will be removed.
                     * 
                     * @param {Boolean} [options.doBoardInsert=true]
                     *              When true, the items created will be inserted
                     *              into the board widget. Set to false if doing it
                     *              elsewhere.
                     * 
                     * @return {Object} itemsForBoard
                     *              An object with state=string of html for
                     *              insertion into the Board.
                     * 
                     */
                    showItemsOnBoard:   function(options){
                        
        // console.time("Board.ShowItemsOnBoard()");
                        
                        
                        var thisOpt         = $.extend({}, {
                                                rows:           opt.listItems,
                                                refresh:        false,
                                                doBoardInsert:  true
                                            }, options),
                            newItems        = [],
                            delItems        = [],
                            chgItems        = [],
                            itemsForBoard   = {}, // each state as the key... string of html as value
                            boardItemStr    = "",
                            boardItemCntr   = null,
                            thisRowState    = null,
                            thisRowID       = null,
                            evData          = null,
                            thisListRow     = null,
                            x,y;
                        
                        
                        /**
                         * Creates a new items using the given template
                         * and returns a string of that new items.
                         *  
                         * @param {Object} itemDataObj  -   The item's object.
                         * @param {jQUery} $uiELe       -   The UI container.
                         * 
                         * @return {String} new item html
                         * 
                         */
                        function createNewItem(itemDataObj, $uiEle) {
                            
                            var newItem     = "",
                                itemId      = null,
                                css         = "";
                            
                            // Caller defined a function for item template?
                            if ($.isFunction(opt.template)) {
                                
                                newItem = opt.template.call(
                                            ele, itemDataObj, $uiEle);
                                
                                if (newItem) {
                                    
                                    newItem = String(newItem);
                                    
                                }
                                
                                
                            // ELSE: Caller did not define function for template
                            } else {
                                
                                newItem = $.SPWidgets.fillTemplate(opt.template, thisListRow );
    
                            }
                            
                            // If we have a UI element already and a new item was created
                            // insert it directly into the UI element.
                            if ($uiEle !== undefined && newItem !== "") {
                                
                                $uiEle.html(newItem);
                                
                            // Else, we have no UI Element... If the new Item is not
                            // blank, then create a new item for insertion.
                            } else if (newItem !== "") {
                                
                                // Accomodate possible knockout objects
                                itemId = itemDataObj.ID;
                                
                                if ($.isFunction(itemDataObj.ID)) {
                                    
                                    itemId = itemDataObj.ID();
                                    
                                }
                                
                                // Store this item to be added to the board in bulk
                                if ( itemsForBoard[thisRowState] === undefined ) {
                                    
                                    itemsForBoard[thisRowState] = "";
                                    
                                }
                                
                                if (opt.initDone && thisOpt.refresh) {
                                    
                                    css += " spwidget-temp";
                                    
                                }
                                
                                itemsForBoard[thisRowState] += 
                                    '<div class="spwidget-board-state-item ui-state-default ui-corner-all' +
                                    css + '" data-id="' + itemId + '">' + newItem + '</div>';
                                
                            }
                            
                            return newItem;
                            
                        } //end: ------> createNewItem()
                        
                        
                        // If refresh is false, then erase all items
                        // currently in the board
                        if (!thisOpt.refresh) {
                            
                            for(x=0,y=opt.states.length; x<y; x++){
                                
                                opt.states[x].headerTotalEle.html("0");
                                opt.states[x].dataEle.empty();
                                
                            }
                            
                        }
                        
         
         // console.time("Board.ShowItemsOnBoard().each(rows)");
         
                        // Populate each row into its respective column
                        for(x=0,y=thisOpt.rows.length; x<y; x++){
                            
                            thisListRow = thisOpt.rows[x];
                            
                            // Get this row's State and ID. 
                            // Accomodate possible knockout objects
                            thisRowState = thisListRow[opt.field] || "";
                            thisRowID    = thisListRow.ID;
                            
                            if ($.isFunction(thisRowState)) {
                                
                                thisRowState = thisListRow[opt.field]();
                                
                            }
                            
                            if ($.isFunction(thisRowID)) {
                                
                                thisRowID = thisRowID();
                                
                            }
    
                            // If not a refresh, then the entire UI is being
                            // rebuilt. We'll be working with Strings. 
                            if (thisOpt.refresh === false) {
                                
                                // if INIT is done (true), then capture this as a new
                                // item on the board (for events)
                                if (opt.initDone) {
                                    
                                    newItems.push(thisListRow);
                                    
                                }
                                
                                createNewItem(thisListRow);
                                
                            // ELSE, must be doing a Refresh and these
                            // items could already exist on the board.
                            } else {
                                
                                // Try to find this row in the board
                                boardItemCntr = opt.statesCntr
                                        .find( "div[data-id='" + thisRowID + "']" );
                            
                                // If item was NOT found on the board, then
                                // we're adding it now.
                                if ( !boardItemCntr.length ) {
                                    
                                    // if INIT is done (true), then capture this as a new
                                    // item on the board (for events)
                                    if (opt.initDone) {
                                        
                                        newItems.push(thisListRow);
                                        
                                    }
                                    
                                    createNewItem(thisListRow);
                                    
                                // Else, item was found on the Board.
                                } else {
                                    
                                    // Add a temporary class to the item, so that we
                                    // know a little later (below) that this is still
                                    // a valid item
                                    boardItemCntr.addClass("spwidget-temp");
                                    
                                    // Check if it should be moved to a new STate (column)
                                    if (boardItemCntr.closest("div.spwidget-board-state")
                                            .data("boardstate") !== thisRowState
                                    ) {
                                        
                                        boardItemCntr.appendTo(opt.statesMap[thisRowState].dataEle);
                                        chgItems.push(thisListRow);
                                        
                                    }
                                    
                                    // Refresh the UI for the item with the new data
                                    createNewItem(thisListRow, boardItemCntr);
                                    
                                }
                                
                            } //end: if(): is it refresh?
                            
                        } //end: for() - each thisOpt.rows[]
                        
         // console.timeEnd("Board.ShowItemsOnBoard().each(rows)");
         
                        // should we update the board?
                        if (thisOpt.doBoardInsert) {
                            
         
         // console.time("Board.ShowItemsOnBoard().InsertIntoDOM");
         
         
                            for (x in itemsForBoard) {
                                
                                if ( itemsForBoard.hasOwnProperty(x) && itemsForBoard[x] !== "" ) {
                                    
                                    opt.statesMap[x].dataEle.append( itemsForBoard[x] );
                                    
                                }
                                
                            }
                            
                            // Update the board headers with the totals
                            opt.updBoardHeaders();
                            
                            // Add the mouseover hover affect.
                            $.pt.addHoverEffect(ele.find(".spwidget-board-state-item"));
                            
         
         // console.timeEnd("Board.ShowItemsOnBoard().InsertIntoDOM");
         
         
                        } 
         
                        // If initialization is done and board is being 
                        // refreshed, then check to see if any items are
                        // no longer valid
                        if (opt.initDone && thisOpt.refresh) {
                            
                            opt.statesCntr.find("div.spwidget-board-state-item")
                                    .not("div.spwidget-temp").each(function(){
                                        
                                        delItems.push( 
                                            opt.getBoardItemDataObject( $(this).data("id") )
                                        );
                                        
                                        $(this).remove();
                                        
                                    })
                                    .end()
                                .removeClass("spwidget-temp");
                                
                        }
                        
                        // If initialization was done already, then 
                        // trigger events and refresh jQuery UI widget
                        if (opt.initDone) {
                            
                            // Refresh sortable widget if init was already done
                            opt.statesCntr.find("div.spwidget-board-state")
                                    .sortable("refresh")
                                    .end()
                                .disableSelection();
                                
                            $.SPWidgets.makeSameHeight( opt.statesCntr.find("div.spwidget-board-state"), 20 );
    
                            // Get a new event object
                            evData = opt.getEventObject();
                            
                            // Trigger events if init has already been done
                            if (newItems.length) {
                                
                                evData.itemsModified.length = 0;
                                evData.itemsModified.push(newItems);
                                ele.trigger(
                                    "spwidget:boarditemadd",
                                    [ ele, $.extend( {}, evData ) ] );
                                
                            }
                            
                            if (delItems.length) {
                                
                                evData.itemsModified.length = 0;
                                evData.itemsModified.push(delItems);
                                ele.trigger(
                                    "spwidget:boarditemremove",
                                    [ ele, $.extend( {}, evData ) ] );
                                
                            }
                            
                            // Push both updates and removals to the eventObject
                            evData.itemsModified.length = 0;
                            evData.itemsModified.push.apply(evData.itemsModified, newItems);
                            evData.itemsModified.push.apply(evData.itemsModified, delItems);
                            evData.itemsModified.push.apply(evData.itemsModified, chgItems);
                            
                            // Trigger event if anything has changed.
                            if (evData.itemsModified.length) {
                                
                                ele.trigger("spwidget:boardchange", [ ele, evData ]);
                                
                            }
                            
                        }//end: if(): initDone == true
                        
         
         
         // console.timeEnd("Board.ShowItemsOnBoard()");
         
                        return itemsForBoard;
                            
                    }, //end: opt.showItemsOnBoard()
                    
                    /**
                     * Updates the board headers with the total number of
                     * items under each state column
                     * 
                     * @param {options} [options]
                     * @param {String|} [options.state=null] The state to be updated
                     * 
                     */
                    updBoardHeaders: function(options) {
                        
                        var thisOpt = $.extend({}, {
                                state: null
                            }, options ),
                            x,y;
                        
                        // Specific state
                        if (thisOpt.state) {
                            
                            // FIXME: Need to implement functionality
                            
                        // ALL States
                        } else {
                            
                            for( x=0,y=opt.states.length; x<y; x++ ){
                                
                                opt.states[x].headerTotalEle
                                    .html(
                                        opt.states[x].dataEle.children().length
                                    );
                                    
                            }
                            
                        }
                        
                    }, //end: opt.updBoardHeaders()
                    
                    /**
                     * Returns an object with data about the board that can
                     * be used to pass along to events.
                     * @class
                     * 
                     * @param {jQuery|HTMLElement} uiItemEle    The board item to initiate the event object from.
                     * 
                     * @return {Object}
                     * 
                     */
                    getEventObject: function(uiItemEle){
                        
                        if (!uiItemEle) {
                            uiItemEle = opt.statesCntr.find("div.spwidget-board-state-item:first");
                        }
                        uiItemEle = $(uiItemEle);
                        
                        var evObj = {
                                /** @property {Object} evObj.stateTotal A map of state name to total number of items */
                                stateTotals:    {},
                                
                                /** @property {Integer} itemTotal   The total number of items in the board, across all states. */
                                itemTotal: 0,
                                
                                /** @property {String} evObj.currentState   The state name */ 
                                currentState:   uiItemEle.closest("div.spwidget-board-state")
                                                    .data("boardstate"),
                                
                                /** @property {Object} evObj.itemObj    The individual board item data */
                                itemObj:        ( opt.getBoardItemDataObject( uiItemEle.data("id") ) || {} ),
                                
                                /** @property {Array} evObj.itemsModified   The list of objects representing the modified items */
                                itemsModified: []
                            },
                            x,j;
                        
                        // Build totals
                        for( x=0,j=opt.states.length; x<j; x++ ){
                            
                            evObj.itemTotal += evObj.stateTotals[opt.states[x].name] = Number( opt.states[x].headerTotalEle.text() );
                            
                        }
                        
                        return evObj;
                        
                    }, //end: opt.getEventObject()
                    
                    /**
                     * Returns the url (full url) for the requested form
                     * of the List.
                     * 
                     * @param {String} type
                     *          A static string value indicating the type
                     *          of form to return. Valid values include
                     *          'EditForm', 'DisplayForm' and 'NewForm' 
                     * 
                     * @return {String}
                     *          The url to the list form.
                     *  
                     */
                    getListFormUrl: function(type) {
                        
                        type = String(type).toLowerCase();
                        
                        function loadFormCollection() {
                            
                            $().SPServices({
                                operation:      "GetFormCollection",
                                listName:       opt.list,
                                webURL:         opt.webURL,
                                cacheXML:       true,
                                async:          false,
                                completefunc:   function(xData, Status) {
                                    
                                    // Need to check for errors?
                                    
                                    $(xData.responseXML)
                                        .find("Form")
                                        .each(function(){
                                            
                                            var $thisForm = $(this);
                                            
                                            opt.formUrls[ String($thisForm.attr("Type")).toLowerCase() ] = 
                                                opt.webURL + "/" + $thisForm.attr("Url");
                                            
                                        });
                                    
                                    
                                } //end: completefunc
                            });
                            
                        } //end: loadFormCollection()
                        
                        
                        if (opt.formUrls === null) {
                            
                            opt.formUrls = {};
                            loadFormCollection();
                            
                        }
                        
                        return ( opt.formUrls[type] || "" );
                        
                    } // end: opt.getListFormUrl()
                    
            });//end: $.extend() set opt
            
            // Check for Required params
            if ( !opt.list || !opt.field ) {
                
                ele.html("<div>SPWidgets:Board [ERROR] Missing required input parameters!</div>");
                return this;
                
            }
            
            // Store instance object and mark element "loading"
            ele.addClass("loadingSPShowBoard").data("SPShowBoardOptions", opt);
            
            
            // get board states from the table definition
            opt.getBoardStates().then(function(){
                
                ele.removeClass("loadingSPShowBoard").addClass("hasSPShowBoard");
                
                // Populate the element with the board template
                ele.html($(Board.htmlTemplate).filter("div.spwidget-board"));
                
                // Get a copy of the state column for both headers and values
                opt.tmpltHeader  = $("<div/>")
                                    .append(
                                        ele.find("div.spwidget-board-headers-cntr div.spwidget-board-state").clone()
                                    ).html();
                                
                opt.tmpltState   = $("<div/>")
                                .append(
                                    ele.find("div.spwidget-board-states-cntr div.spwidget-board-state")
                                )
                                .html();
                            
                // Get pointers to the containers in the UI
                opt.statesCntr  = ele.find("div.spwidget-board-states-cntr")
                                .addClass("spwidget-states-" + opt.states.length)
                                .empty();
                                
                opt.headersCntr = ele.find("div.spwidget-board-headers-cntr")
                                .addClass("spwidget-states-" + opt.states.length)
                                .empty();
                
                // Build the board columns
                $.each(opt.states, function(i,v){
                    
                    v.headerEle = $(opt.tmpltHeader).appendTo(opt.headersCntr)
                                    .attr("data-boardstate", v.name)
                                    .attr("data-boardindex", i)
                                    .html(v.title);
                                    
                    v.dataEle = $(opt.tmpltState).appendTo(opt.statesCntr)
                                    .attr("data-boardindex", i)
                                    .attr("data-boardstate", v.name);
                    
                    // Create the header element that holds the total
                    v.headerTotalEle = $('<span>&nbsp;[<span class="spwidget-state-item-total">0</span>]</span>')
                                        .appendTo(v.headerEle)
                                        .find("span.spwidget-state-item-total");
                    
                });
                
                $(opt.headersCntr,opt.statesCntr)
                    .append('<div style="clear:both;"></div>');
    
                // Create listeners on the board.
                ele
                    // Bind function to sortable events so that headers stay updated
                    .on("sortreceive sortremove", function(ev, ui){
                    
                        opt.updBoardHeaders();
                        $(ui.item).removeClass("ui-state-hover");
                        
                    })
                    
                    // On Sortcreate: update headers
                    // On Sortreceive: update item
                    .on("sortreceive sortcreate", function(ev, ui){
                        
                        var evData = opt.getEventObject(ui.item),
                            dfd, itemId;
                        
                        // Sortcreate
                        if (ev.type === "sortcreate") {
                            
                            if ($.isFunction(opt.onBoardCreate)) {
                                
                                opt.onBoardCreate.call(ele, evData);
                                
                            }
                            
                            $(ev.target).trigger("spwidget:boardcreate", [ ele, evData ]);                                
                        
                        // sortreceive
                        } else {
                            
                            dfd     = $.Deferred();
                            itemId  = '';
                            
                            // Handle possibly the itemObject being a knockout object
                            if ($.isFunction(evData.itemObj.ID)) {
                                
                                itemId = evData.itemObj.ID();
                                
                            } else {
                                
                                itemId = evData.itemObj.ID;
                                
                            }
                            
                            // Make the update to the state in SP
                            evData.updates       = []; // Format = SPService UpdateListItems
                            evData.updatePromise = dfd.promise();
                            evData.updates.push([ opt.field, evData.currentState ]);
                            
                            // TODO: need to normalize evData by adding values to itemsModified
                            
                            // Call any onPreUpdate event. If TRUE (boolean) is returned,
                            // update is canceled. Note that the UI is not updated to 
                            // reflect a canceled update (ex. item is not moved back to
                            // original position)
                            if ($.isFunction(opt.onPreUpdate)) {
                                
                                if (opt.onPreUpdate.call(ui.item, ev, ui.item, evData) === true) {
                                    
                                    return this;
                                    
                                }
                                
                            }
                            
                            // If no updates to make, exit here.
                            if (!evData.updates.length) {
                                
                                return this;
                                
                            }
                            
                            // Make update to SP item
                            $().SPServices({
                                operation:      "UpdateListItems",
                                listName:       opt.list,
                                async:          true,
                                ID:             itemId,
                                valuepairs:     evData.updates,
                                completefunc:   function(xData, status){
                                    
                                    // Process Errors
                                    if (status === "error") {
                                        
                                        dfd.rejectWith(
                                                ele,
                                                [ 'Communications Error!', xData, status ]);
                                        
                                        return;
                                        
                                    }
                                    
                                    var resp = $(xData.responseXML),
                                        row  = null;
                                    
                                    if ( resp.SPMsgHasError() ) {
                                         
                                         dfd.rejectWith(
                                                ele,
                                                [ resp.SPGetMsgError(), xData, status ]);
                                        
                                        return;
                                        
                                    }
                                    
                                    row = $(xData.responseXML).SPFilterNode("z:row")
                                                .SPXmlToJson({includeAllAttrs: true});
                                    
                                    $(ev.target).trigger(
                                        "spwidget:boardchange", [ ui.item, evData ] );
                                    
                                    dfd.resolveWith(ev.target, [evData.itemObj, xData]);
                                    
                                }//end: completefunc()
                            });
                            
                        }//end: if()
                        
                    }) // end: ele.on("sortreceive sortcreate")
                    
                    // Buind event to catch board actions
                    .on("click", "a.spwidgets-board-action", function(ev){
                        
                        var $actionEle  = $(ev.currentTarget),
                            action      = String(
                                                $actionEle
                                                    .data("spwidgets_board_action")
                                            )
                                            .toLowerCase(),
                            gotoUrl     = "",
                            thisPageUrl = $.pt.getEscapedUrl(window.location.href); 
                        
                        // TODO: enhance to open item in dialog (SP2010) if that feature is on
                        
                        switch (action) {
                            
                            case "edit-item": 
                                
                                gotoUrl = opt.getListFormUrl("EditForm");
                                
                                break;
    
                            case "view-item": 
                                
                                gotoUrl = opt.getListFormUrl("DisplayForm");
                                
                                break;
                            
                            
                        } //end: switch()
                        
                        window.location.href = gotoUrl + 
                            "?ID=" + $actionEle.data("spwidgets_id") +
                            "&Source=" + thisPageUrl;
                            
                        return this;
                            
                    }); //end: ele.on()
                    
                // If no template was defined, use default
                if (opt.template === null) {
                    
                    opt.template = $( Board.htmlTemplate )
                                    .filter("div.spwidget-item-template");
                    
                }
                
                // Retrieve the items from the List and then
                // Display items retrieved on the board
                opt._getListItems()
                    .then(function(){
                        
                        opt.showItemsOnBoard();
                        
                        // Make the columns "sortable"
                        opt.statesCntr.find("div.spwidget-board-state").each(function(){
                            var thisState = $(this);
                            thisState.sortable({
                                connectWith:    thisState.siblings(),
                                containment:    ele,
                                cursor:         "move",
                                tolerance:      "pointer",
                                opacity:        ".80",
                                remove:         function(ev, ui){
                                    
                                    $.SPWidgets.makeSameHeight(
                                        opt.statesCntr
                                            .find("div.spwidget-board-state"), 20 );
                                    
                                }//end: remove()
                            });
                            
                        });
                        
                        // Make text inside the states container un-selectable.
                        opt.statesCntr.disableSelection();
                        
                        opt.initDone = true;
                        
                        $.SPWidgets.makeSameHeight( opt.statesCntr.find("div.spwidget-board-state"), 20 );
                        
                    });
            
            }); //end: .then()
            
            return this;
            
        });//end: return .each()
        
    };//end: $.fn.SPShowBoard()
    
    /**
     * @property
     * Stores the Style sheet that is inserted into the page the first
     * time SPShowBoard() is called.
     * Value is set at build time.
     */
    Board.styleSheet = "/** \n"
+ " * Stylesheet for the Board widget\n"
+ " * \n"
+ " * BUILD: May 09, 2013 - 06:51 PM\n"
+ " */\n"
+ "div.spwidget-board {\n"
+ "    width: 100%;\n"
+ "    position: relative;\n"
+ "}\n"
+ "\n"
+ "div.spwidget-board div.spwidget-board-headers,\n"
+ "div.spwidget-board div.spwidget-board-headers-cntr,\n"
+ "div.spwidget-board div.spwidget-board-states-cntr, \n"
+ "div.spwidget-board div.spwidget-board-states {\n"
+ "    width: 100%;\n"
+ "}\n"
+ "\n"
+ "div.spwidget-board div.spwidget-board-state {\n"
+ "    width: 49%;\n"
+ "    float: left;\n"
+ "    margin: .1%;\n"
+ "    padding: .2%;\n"
+ "}\n"
+ "\n"
+ "div.spwidget-board div.spwidget-board-headers-cntr {\n"
+ "    border: none;\n"
+ "}\n"
+ "div.spwidget-board div.spwidget-board-headers-cntr div.spwidget-board-state {\n"
+ "    text-align: center;\n"
+ "    font-weight: bold;\n"
+ "    font-size: 1.1em;\n"
+ "}\n"
+ "div.spwidget-board div.spwidget-board-states div.spwidget-board-state {\n"
+ "    margin-bottom: 1em;\n"
+ "    min-height: 5em;\n"
+ "}\n"
+ "\n"
+ "div.spwidget-board div.spwidget-board-state div.spwidget-board-state-item {\n"
+ "    padding: .2em;\n"
+ "    margin: .5em .2em;\n"
+ "    font-weight: normal;\n"
+ "    cursor: move;\n"
+ "    overflow: auto;\n"
+ "}\n"
+ "div.spwidget-board div.spwidget-board-state-item div.spwidget-board-item-actions{\n"
+ "    margin-top: .5em;\n"
+ "    padding: .2em .5em;\n"
+ "    width: 25%;\n"
+ "    overflow: hidden;\n"
+ "    text-align: center;\n"
+ "}\n"
+ "div.spwidget-board div.spwidget-board-state-item .spwidget-board-handle {\n"
+ "    \n"
+ "}\n"
+ "\n"
+ "/* Number of Columns (96 % #columns)\n"
+ " * Currently support 10 columns. \n"
+ " */\n"
+ "div.spwidget-board .spwidget-states-3 div.spwidget-board-state {\n"
+ "    width: 32.4%;\n"
+ "}\n"
+ "div.spwidget-board .spwidget-states-4 div.spwidget-board-state {\n"
+ "    width: 24%;\n"
+ "}\n"
+ "div.spwidget-board .spwidget-states-5 div.spwidget-board-state {\n"
+ "    width: 19.1%;\n"
+ "}\n"
+ "div.spwidget-board .spwidget-states-6 div.spwidget-board-state {\n"
+ "    width: 15.8%;\n"
+ "}\n"
+ "div.spwidget-board .spwidget-states-7 div.spwidget-board-state {\n"
+ "    width: 13.4%;\n"
+ "}\n"
+ "div.spwidget-board .spwidget-states-8 div.spwidget-board-state {\n"
+ "    width: 11.6%;\n"
+ "}\n"
+ "div.spwidget-board .spwidget-states-9 div.spwidget-board-state {\n"
+ "    width: 10.2%;\n"
+ "}\n"
+ "div.spwidget-board .spwidget-states-10 div.spwidget-board-state {\n"
+ "    width: 9.1%;\n"
+ "}\n";
//_HAS_BOARD_CSS_TEMPLATE_
    
    
    /**
     * @property
     * Stores the HTML template for each Board widget.
     * Value is set at build time.
     */
    Board.htmlTemplate = "<div class=\"spwidget-board\">\n"
+ "    <div class=\"spwidget-board-headers\">\n"
+ "        <div class=\"spwidget-board-headers-cntr ui-widget-content ui-corner-all\">\n"
+ "            <div class=\"spwidget-board-state ui-widget-content ui-corner-all\"></div>\n"
+ "            <div style=\"clear:both;\"></div>\n"
+ "        </div>\n"
+ "    </div>\n"
+ "    <div style=\"clear:both;\"></div>\n"
+ "    <div class=\"spwidget-board-states\">\n"
+ "        <div class=\"spwidget-board-states-cntr\">\n"
+ "            <div class=\"spwidget-board-state ui-widget-content ui-corner-all\"></div>\n"
+ "            <div style=\"clear:both;\"></div>\n"
+ "        </div>\n"
+ "    </div>\n"
+ "    <div style=\"clear:both;\"></div>\n"
+ "</div>\n"
+ "<div class=\"spwidget-item-template\">\n"
+ "    <div>\n"
+ "        <div>#{{ID}}: {{Title}}</div>\n"
+ "        <div class=\"ui-state-active ui-corner-all spwidget-board-item-actions\">\n"
+ "            <a class=\"spwidgets-board-action\" href=\"javascript:\" title=\"View Item\" data-spwidgets_id=\"{{ID}}\" data-spwidgets_board_action=\"view-item\"><img src=\"/_layouts/images/icgen.gif\" border=\"0\"/></a>\n"
+ "            <a class=\"spwidgets-board-action\" href=\"javascript:\" title=\"Edit Item\" data-spwidgets_id=\"{{ID}}\" data-spwidgets_board_action=\"edit-item\"><img src=\"/_layouts/images/CMSEditSourceDoc.GIF\" border=\"0\"/></a>\n"
+ "        </div>\n"
+ "    </div>\n"
+ "</div>\n";
//_HAS_BOARD_HTML_TEMPLATE_
    
    
})(jQuery);
/**
 * Widget that turn an input field into a lookup field. The
 * field will store only the ID's (one or more) for the items
 * that the user picks.
 * THe user, however, is presented with the existing items
 * and has the ability to Remove them and add new ones.
 * 
 * BUILD: May 09, 2013 - 06:51 PM
 * 
 */

;(function($){
    
    "use strict";
    /*jslint nomen: true, plusplus: true */
    /*global SPWidgets */
    
    
    /**
     * Namespace for pickSPUser specific methods.
     * @name        Lookup
     * @class       Namespace for lookup Field plugin
     */
    var Lookup = {
        _islookupFieldCssDone: false
    };
    
    // Default options
    $.SPWidgets.defaults.LookupField = {
        list:               '',
        allowMultiples:     true,
        inputLabel:         '',
        inputPlaceholder:   'Type and Pick',
        readOnly:           false,
        exactMatch:         true,
        uiContainer:        null,
        selectFields:       ['Title'],
        filter:             '',
        filterFields:       ['Title'],
        template:           '<div>{{Title}} <span class="spwidgets-item-remove">[x]</span></div>',
        listTemplate:       '{{Title}}',
        listHeight:         0,
        onItemAdd:          null,
        onItemRemove:       null,
        onReady:            null,
        msgNoItems:         "",
        maxResults:         50,
        minLength:          2,
        hideInput:          true,
        padDelimeter:       false,
        showSelector:       false
    };
    
    // $(function(){
        // $("body").on("click", function(ev){
            // var selectors = $("div.ptLookupSPFieldSelectorCntr:visible");
            // if (selectors.length > 0) {
                // if ($(ev.target).closest("div.spwidgets-lookup-cntr").length == 0) {
                    // selectors.css("display", "none");
//                 
                // } else {
                    // selectors.each(function(){
                        // if ($(this).closest("div.spwidgets-lookup-cntr").find(ev.target).length < 1) {
                            // selectors.css("display", "none");
                        // }
                    // });
//                     
//                     
                // // FIXME: @@@@@@ working here: 2012.11.8
//                     
//                     
                // }
            // }
//             
        // })
    // });
    

    /**
     * 
     * Converts the selection into a Sharepoint Lookup Field.
     * 
     * @param {Object} options
     * 
     * @param {String} options.list
     *              List name from where lookup will be done.
     * 
     * @param {Boolean} [options.allowMultiples=true]
     *              Set to false if wanting only 1 item to be referenced.
     * 
     * @param {String} [options.inputLabel=""]
     *              The label for the input field.
     * 
     * @param {String} [options.inputPlaceholder="Type and Pick"]
     *              The value to be used in the Input Field placeholder
     *              attribute (HTML5 attribute)
     * 
     * @param {Boolean} [options.exactMatch=true]
     *              If set to false, then the text entered by the user will
     *              be parsed into individual keywords and a search will be
     *              done on those instead.
     * 
     * @param {Boolean} [options.readOnly=false]
     *              If true, field is displayed as readonly.
     * 
     * @param {Selector|Object} [options.uiContainer=null]
     *              The container where the UI widget should be inserted.
     *              Default is directly after the input field
     * 
     * @param {Array} options.selectFields=["Title"]
     *              Array of field names (internal names) that should be
     *              returned. ID is also used when the input value by the
     *              user is an integer.
     * 
     * @param {String} [options.filter=""]
     *              Any additional filter criteria (in CAML format) to be
     *              added to the query when retrieving the Lookup values
     *              from the list.
     *              Example:
     *                  <Contains>
     *                      <FieldRef Name="Title" />\
     *                      <Value Type="Text">New</Value>
     *                  </Contains>
     * 
     * @param {Array} [options.filterFields=["Title"]]
     *              Array of fields name (internal names) that will be used
     *              to filter data against.
     *              Example: 
     *                  options.filterFields=[
     *                      "Title",
     *                      "Description",
     *                      "Notes"
     *                  ]  
     * 
     * @param {String} [options.template="..."]
     *              The template to be used for displaying the item once selected.
     *              Use the following format for item Field placeholders
     *              {{fieldInternalName}}. When defining HTML, an element containing
     *              a call of 'spwidgets-item-remove' will be used to remove the item
     *              from the selected list.
     *              Example:
     *                  options.template='<div>{{Title}} [<span class="spwidgets-item-remove">x</span>]</div>',
     * 
     * @param {String} [options.listTemplate="..."]
     *              The template to be used for displaying the items displayed as
     *              suggestion (autocomplete values).
     *              Use the following format for item Field placeholders
     *              {{fieldInternalName}}. Example: {{Title}}
     * 
     * @param {Number} [options.listHeight=0]
     *              The height to be set on the Autocomplete suggesion box.
     *              Use this value when there is a chance for allot of values
     *              to be returned on a query.
     * 
     * @param {Boolean} [options.padDelimeter=false]
     *              If true, then an extra delimeter (;#) will be inserted at
     *              the begining of the stored value.
     *              Example: ;#;#5;#  (normal would be: 5;#)
     * 
     * @param {Function} [options.onReady=null]
     *              Triggered after the LookupField has been setup. This is
     *              triggered either after completing the UI setup, or if the
     *              field already had pre-defined values, after retrieving that
     *              data and displaying it.
     *              Function will be given a scope of the original selector
     *              (the field) as well as the following input params:
     *              1) widget container (jQuery)
     *              Example:
     *                  onReady: function(widgetCntr){
     *                      //this=original selector to where the widget was bound
     *                  } 
     * 
     * @param {Function} [options.onItemAdd=null]
     *              Function that will be called when adding a new item reference
     *              to the list of currently picked item. This method could, if 
     *              necessary remove the new item from the UI (ex. due to some
     *              custom validation rule). 
     *              The function will be given a scope of the bound area (the 
     *              input field) as well as two input parameters:
     *              1) A jQuery object representing the new item
     *              on the UI and
     *              2) An object with the item's information
     *              Example:
     *                  onItemAdd: function($newItemSelection, itemObject, widgetCntr){
     *                      //this=original selector to where the widget was bound
     *                  }
     * 
     * @param {String} [options.msgNoItems=""]
     *              Message to be displayed when no items are selected. Set this
     *              to null/blank if wanting nothing to be displayed, which will
     *              result in only the input selection field being displayed.
     * 
     * @param {Integer} [options.maxResults=50]
     *              Max number of results to be returned as the user types the filter
     * 
     * @param {Integer} [options.minLength=2]
     *              The minimum length before the autocomplete search is triggered.
     * 
     * @param {Boolean} [options.hideInput=true]
     *              Option used only when allowMultiples is false. It will hide
     *              the input field once a value has been selected. Only way to
     *              get it displayed again is to remove existing selected item.
     * 
     * @param {Boolean} [options.hideInput=false]
     *              If true, then an icon will be displayed to the right of the
     *              selection input field that displays a popup displaysing all
     *              values currently in the lookup List.
     * 
     * 
     * @return {jQuery} Selection
     * 
     * 
     * 
     * Methods:
     * 
     * jQuery(ele).SPLookupField("method", <action>, <options>)
     * 
     * clear    Clears all items currently reference.
     *          Usage:
     *              $(ele).SPLookupField("method", "clear"); // clears all
     *              $(ele).SPLookupField("method", "clear", { id: 5 }); // clear ID=5
     *              $(ele).SPLookupField("method", "clear", { id: [5, 123455] }); // clear ID=5 and 123455
     * 
     * 
     * 
     */
    $.fn.SPLookupField = function(options) {
        
        // if the global styles have not yet been inserted into the page, do it now
        if (!Lookup._islookupFieldCssDone) {
            Lookup._islookupFieldCssDone = true;
            $('<style type="text/css">' + "\n\n" +
                    Lookup.styleSheet +
                    "\n\n</style>")
                .prependTo("head");
        }
        
        // Store the arguments given to this function. Used later if the
        // user is trying to execute a method of this plugin.
        var arg = arguments;
        
        // Initiate each selection as a Lookup element
        this.each(function(){
            
            var ele = $(this);
            
            // TODO: may need to change code below if going to bind to other types of fields (like select)
            // FIXME: when allowing textarea, need to ensure that its definition is textonly (no HTML)
            
            if (    ( !ele.is("input") && !ele.is("textarea") )
                ||  ele.hasClass("hasLookupSPField")
            ){
                // if the first argument is a string, and this is an input
                // field, then process methods
                if (typeof options === "string" && ele.is("input")) {
                    
                    var o = ele.data("SPWidgetLookupFieldUI").data("SPWidgetLookupFieldOpt"); 
                    
                    // METHOD
                    if (options.toLowerCase() === 'method') {

                        var cmd     = String(arg[1] || '').toLowerCase();
                        var cmdOpt  = arg[2] || {};
                        
                        // ACTION: clear
                        if (cmd === "clear") {
                            if (cmdOpt.id === undefined) {
                                o._cntr.find("div.spwidgets-lookup-selected")
                                    .css("display", "none")
                                    .empty();
                                o._ele.val("");
                                
                                // Make sure input is visible
                                o._cntr.find("div.spwidgets-lookup-input").css("display", "");
                                
                            } else {
                                alert("TBD... Delete individual ID's");
                            }
                        }                        
                    }//end: options === method
                }
                
                // Exit
                return this;
            }
            
            
            // CREATE THE WIDGET ON THE PAGE.
            
            // Options for this element
            var o = $.extend(
                    {},
                    $.SPWidgets.defaults.LookupField,
                    options, 
                    {
                        _ele: ele.css("display", "none").addClass("hasLookupSPField") 
                    }
                );
            
            
            /**
             * Displays items selected by the user on the UI and updates
             * the original input element if necessary.
             * 
             * @params {Array|Object} items
             *          An object or array of object wiht the items
             *          to be shown as slected
             * @params {Boolean} [doNotStoreIds=false]
             *          If true, then the IDs of the items that will be
             *          shown as selected will not be added to the input
             *          field. Good for when initially displaying data
             *          that is defined in the intput field
             *          (ex. when the widget is first bound)
             * 
             */
            o.showSelectedItems = function(items, doNotStoreIds) {
                
                var itemCntr    = o._selectedItemsCntr.css("display", ""),
                    itemList    = [],
                    wasUpdated  = false;
                
                // If this is the first item, empty container
                if (    !itemCntr.find("div.spwidgets-item").length
                    ||  o.allowMultiples === false
                ) {
                    
                    itemCntr.empty();
                    
                }
                
                // If input is an array, then use that to iterate over.
                if ( $.isArray(items) ) {
                    
                    itemList = items;
                    
                // Else, the input must not be an array (assume single object)
                // Add it as an item in the defiend array.
                } else {
                    
                    itemList.push(items);
                    
                }
                
                // Loop through each item to be shown as selected
                $.each(itemList, function(i, item){
                    
                    // If this item is not yet displayed, then add it now
                    if (!itemCntr.find("div.spwidgets-item-id-" + item.ID).length) {
                        
                        
                        // Create the new item UI and append it to the
                        // display area.
                        var thisItemUI = 
                                $('<div class="spwidgets-item spwidgets-item-id-' + item.ID + 
                                        '" data-spid="' + item.ID + '" style="display:none">' + 
                                        $.SPWidgets.fillTemplate(o.template, item) +
                                        '</div>'
                                    )
                                    .find(".spwidgets-item-remove")
                                        .on("click.SPWidgets", function(ev){
                                            
                                            Lookup.removeItem(o,this);
                                            
                                        })
                                        .end()
                                    .appendTo( itemCntr );
                        
                        // If an onAddItem event was defined, then run it now
                        // TODO: in future, need to trigger/bubble event as well
                        if ($.isFunction(o.onItemAdd)) {
                            
                            o.onItemAdd.call(o._ele, thisItemUI, item, o._cntr);
                            
                        }
                        
                        // If item is still present in the selction list
                        // then continue on to add its ID to the input field
                        // which is used to store it in the DB.
                        // We check  this here because the .onItemAdd() event
                        // could have removed it from the UI
                        if ( itemCntr.find("div.spwidgets-item-id-" + item.ID).length > 0 ) {
                            
                            wasUpdated = true;
                            
                            // Show the new item on the page. 
                            thisItemUI.fadeIn("slow").promise().then(function(){
                                
                                $(this).css("display", "");
                                
                            });
                            
                            // Store this item's ID in the input field
                            if (doNotStoreIds !== true) {
                                
                                o.storeItemIDs(item.ID, o.allowMultiples);
                                
                            }
                            
                            // If allowMultiples is false, then check if the input field
                            // should be hidden
                            if (o.allowMultiples === false && o.hideInput === true) {
                                
                                o._lookupInputEleCntr.css("display", "none");
                                
                            }
                            
                        } //end: if() is item still in the UI (after .onItemAdd())
                        
                    } //end: if(): item already displayed?
                
                });//end: .each() item
                
                // if an update was made, then trigger the change() event on the
                // original input element.
                if (wasUpdated) {
                    
                    o._ele.trigger("change");
                    
                }
                
            };//end: o.showSelectedItems()
            
            
            /**
             * Stores the ID's of the selected items in the
             * input field that this widget was bound to.
             * 
             * @param {Array|String} ids
             * @param {Boolean} [append=false]
             * 
             */
            o.storeItemIDs = function(ids, append) {
                
                // Store item in input field, by appending this new
                // item to the end of the existing data in the input.
                var newItemValue    = $.trim( o._ele.val() ),
                    isPadDone       = false;
                
                // If ID's not an array, then converted to one and
                // assign its value to the new array.
                if ( !$.isArray(ids) ) {
                    
                    ids = [ ids ];
                    
                }
                
                // If append is not true, then erase whatever
                // data might be there now.
                if (append !== true) {
                    
                    newItemValue = "";
                    
                }
                
                // Loop through all element and add them to the string
                // that will be used to update the input field.
                $.each( ids, function( i, thisID ){
                    
                    if (thisID){
                        
                        // If existing input is blank and padDelimeter is
                        // true, then add an extra delimeter to the begening of the
                        // string.
                        if (newItemValue.length < 1 && o.padDelimeter === true && !isPadDone ) {
                            
                            newItemValue   += ";#";
                            isPadDone       = true;
                            
                        }
                        
                        // If data is already in the input field, then add
                        // delimeter to end of the data.
                        if (newItemValue.length > 0) {
                            
                            newItemValue += ";#";
                        
                        }
                        
                        newItemValue += thisID + ";#";
                        
                        // TODO: Support for having the Title also be saved - similar to SP
                        // Does the .Title value need to be escaped
                        
                    }
                    
                });
                
                // Store the values back on the input element.
                o._ele.val(newItemValue);
                
            };//end: o.storeItemIDs()
            

            // Create the UI container and store the options object in the input field
            o._cntr                 = $(Lookup.htmlTemplate)
                                        .find(".spwidgets-lookup-cntr").clone(1);
            o._selectedItemsCntr    = o._cntr.find("div.spwidgets-lookup-selected");
            o._lookupInputEleCntr    = o._cntr.find("div.spwidgets-lookup-input");
            
            o._cntr.data("SPWidgetLookupFieldOpt", o);
            o._ele.data("SPWidgetLookupFieldUI", o._cntr);
            
            
            // Insert the widget container into the UI
            if (o.uiContainer === null) {
                
                o._cntr.insertAfter(o._ele);
                
            } else {
                
                o._cntr.appendTo($(o.uiContainer));
                
            }
            
            // If showSelector is false, remove the option from the UI...
            // FIXME: maybe we realy want to hide it? case the option is changed later?
            if (!o.showSelector){
                
                o._cntr.find('.ptLookupSPFieldSelectorCntr,.ptLookupSPFieldSelector').remove();
            
            // Else, bind methods for handling the selector.
            } else {
                
                var selectorCntr = o._cntr.find("div.ptLookupSPFieldSelectorCntr");
                
                o._cntr.find(".ptLookupSPFieldSelector")
                    .on("click", function(ev){
                        
                        if (selectorCntr.is(":visible")) {
                            
                            selectorCntr.css("display", "none");
                            
                        } else {
                            
                            selectorCntr.css("display", "block");
                            
                        }
                        
                    });
                
            } //end: else()
            
            // If an input label was defined, then set it, else, remove input label
            if (o.inputLabel) {
                
                o._cntr.find("div.spwidgets-lookup-input label")
                    .empty()
                    .append(o.inputLabel);
                    
            } else {
                
                o._cntr.find("div.spwidgets-lookup-input label").remove();
                
            }
            
            // insert placeholder
            if (o.inputPlaceholder) {
                o._lookupInputEleCntr
                    .find("input")
                        .attr("placeholder", o.inputPlaceholder);
            }
            
            // Hide the ADD input field if we're in readonly mode
            if (o.readOnly === true) {
                
                o._lookupInputEleCntr.css("display", "none");
                
                o._cntr.find("div.spwidget-lookup")
                    .addClass("spwidget-lookup-readyonly");
                
            }
            
            // Convert the list of fields to CAML
            o._selectFields = "";
            $.each(o.selectFields, function(i, f){
                
                o._selectFields += "<FieldRef Name='" + f + "'/>";
                
            });
            
            // Get the token names from the text template
            o._templateTokens = String(o.template).match(/(\$\{.*?\})/g);
            
            if (o._templateTokens == null) {
                o._templateTokens = [];
            }
            
            $.each(o._templateTokens, function(i, thisToken){

                o._templateTokens[i] = thisToken.replace(/[\$\{\}]/g, "");
                
            });
            
            // Bind an Autocomplete to the ADD input of the Lookup widget
            var cache = {};
            o._cntr.find("div.spwidgets-lookup-input input")
                .autocomplete({
                    minLength:  2,
                    appendTo:   o._cntr,
                    
                    /**
                     * Add format to the pick options and set height
                     * if it was defined on input.
                     */
                    open:       function(ev, ui){
                        
                        $(this).autocomplete("widget")
                            .each(function(){
                                
                                if (o.listHeight > 0) {
                                    
                                    $(this).css("height", o.listHeight + "px");
                                    
                                }
                                
                                return false;
                                
                            });
                            
                            // TODO: need to create a class to place a border around suggestion.
                            //        then, add to the above: .find("a").addClass("classname here")
                            
                    },
                    
                    /**
                     * Searches for the data to be displayed in the autocomplete choices. 
                     */
                    source:     function(request, response){
                        
                        request.term = $.trim(request.term);
                        
                        // If search term is in cache, return it now
                        var termCacheName = String($.trim(request.term)).toUpperCase();
                        if (termCacheName in cache) {
                            response(cache[termCacheName]);
                            return;
                        }
                        cache[termCacheName] = [];
                        
                        var filterItems = [];
                        
                        // If search term contains only digits, then do a search on ID
                        var term = String(request.term);
                        if (    term.match(/\D/) === null 
                            &&  term.match(/\d/) !== null) {
                            
                            filterItems.push(
                                "<Eq><FieldRef Name='ID'/>" +
                                "<Value Type='Counter'>" + 
                                term + "</Value></Eq>" );
                            
                            
                        // Else, search all Fields defined by the caller for the term
                        } else {
                            
                            var keywords = [request.term];
                            if (!o.exactMatch) {
                                keywords = String(request.term).split(/ /);
                            }
                            // For each search field, build the search using AND logical
                            for (var n=0,m=o.filterFields.length; n<m; n++){
                                var fieldFilters = [];
                                for (var i=0,j=keywords.length; i<j; i++){
                                    if (!(/^(of|and|a|an|to|by|the|or)$/i).test(keywords[i])) {
                                        fieldFilters.push(
                                            "<Contains><FieldRef Name='" +  o.filterFields[n] + "'/>" +
                                            "<Value Type='Text'>" + keywords[i] + "</Value></Contains>" );
                                    }
                                }
                                filterItems.push($.SPWidgets.getCamlLogical({
                                    values: fieldFilters,
                                    type:   "AND"
                                }));
                            }
                        }
                        
                        // Build the query using OR statements
                        var camlFilter = $.SPWidgets.getCamlLogical({
                                            values: filterItems,
                                            type:   "OR"
                                        });
                                
                        // If caller defined extra REQUIRED criteria, then
                        // build it into the query.
                        if (o.filter) {
                            camlFilter = $.SPWidgets.getCamlLogical({
                                values: [camlFilter, o.filter],
                                type:   "AND"
                            });
                        }
                        
                        // Find the items based on the user's input
                        $().SPServices({
                            operation:      "GetListItems",
                            listName:       o.list,
                            async:          true,
                            CAMLQuery:      '<Query><Where>' + camlFilter + '</Where></Query>',
                            CAMLRowLimit:   o.maxResults,
                            CAMLViewFields: "<ViewFields>" + o._selectFields + "</ViewFields>",
                            completefunc:   function(xData, status){
                                $(xData.responseXML).SPFilterNode("z:row").each(function(){
                                    var thisEle = $(this);
                                    var thisDt  = thisEle.SPXmlToJson({includeAllAttrs: true})[0];
                                    thisDt.value = "";
                                    thisDt.label = $.SPWidgets.fillTemplate(o.listTemplate, thisDt );
                                    
                                    // Add to cache
                                    cache[termCacheName].push(thisDt);
                                    
                                });
                                
                                // Return response
                                response(cache[termCacheName]);
                            }
                        });
                    },//end:source()
                    /**
                     * Event bound to an autocomplete suggestion.
                     * 
                     * @param {jQuery} ev   -   jQuery event.
                     * @param {Object} u    -   An object containing the element generated above
                     *                          by the <source> method that represents the item
                     *                          that was selected.
                     */
                    select: function(ev, u){
                        
                        o.showSelectedItems(u.item);
                        
                    }//end: event: select()
                    
                })//end:autocomplete
                
                /**
                 * ON enter key, if value is less than the minLength, then
                 * Force a search. We pad the query string with spaces so
                 * that it gets pass the autocomplete options set during setup.
                 */
                .on("keyup.SPWidgets", function(ev){
                    if (ev.which != 13 ) { return; }
                    var v = $(ev.target).val();
                    if (v) {
                        if (String(v).length < o.minLength) {
                            $(ev.target).autocomplete("search", v + "    ");
                        }
                    }
                }); 
            
            // If the input field has values, then parse them and display them
            var items = $.SPWidgets.parseLookupFieldValue(o._ele.val());
            if (items.length) {
                
                $().SPServices({
                    operation: "GetListItems",
                    async:      true,
                    listName:   o.list,
                    CAMLQuery:  '<Query><Where>' +
                            $.SPWidgets.getCamlLogical({
                                type:   'OR',
                                values: items,
                                onEachValue: function(n){
                                    var s = "";
                                    if (n.id) {
                                        s = "<Eq><FieldRef Name='ID'/>" +
                                            "<Value Type='Counter'>" + 
                                            n.id + "</Value></Eq>";
                                    }
                                    return s;
                                }
                            }) +
                            '</Where></Query>',
                    CAMLViewFields: "<ViewFields>" + 
                            o._selectFields + "</ViewFields>",
                    CAMLRowLimit: 0,
                    completefunc: function(xData, Status) {
                        
                        // Display the items.
                        var arrayOfCurrentItems = $(xData.responseXML)
                                        .SPFilterNode("z:row")
                                        .SPXmlToJson({
                                            includeAllAttrs:    true,
                                            removeOws:          true
                                        });
                        
                        o.showSelectedItems( arrayOfCurrentItems, true );
                        
                        // If readOnly = true, then remove the "delete item"
                        // link from the elements
                        if (o.readOnly) {
                            
                            o._cntr.find(".spwidgets-item-remove").remove();
                            
                        }
                        
                        // Call onReady function if one was defined. 
                        if ($.isFunction(o.onReady)) {
                    
                            o.onReady.call(o._ele, o._cntr);
                        
                        }
                        
                        return this;
                        
                    }//end: completefunc()
                });
                
            // ELSE, input was blank. Trigger onReady if applicable.
            } else {
                
                if ($.isFunction(o.onReady)) {
                    
                    o.onReady.call(o._ele, o._cntr);
                
                }
                
            } // end: if()
            
            return this;
            
        });
        
        return this;
        
    };//end: $.fn.SPLookupField()
    
    
    /**
     * @memberOf Lookup.lookupField
     * Removes an item association. The html element is removed from
     * UI and the input element is updated to not contain that ID
     * 
     * @return {Object} Lookup
     */
    Lookup.removeItem = function(o, htmlEle) {
        
        var e       = $(htmlEle).closest('div.spwidgets-item'),
            cntr    = e.closest("div.spwidgets-lookup-selected"),
            id      = e.data("spid"),
            items   = $.SPWidgets.parseLookupFieldValue( o._ele.val() ),
            store   = [],
            i       = 0,
            j       = 0;
        
        // FIXME: this method does not consider the padDelimeter param.
        
        // Hide the item the user removed from the UI
        e.fadeOut("fast").promise().then(function(){
            
            e.remove();
            
            // If AllowMultiple is false and msgNoItem is false
            // then hide the selected items container
            if (    !o.msgNoItems
                &&  (   o.allowMultiples === false
                    ||  (   o.allowMultiples === true 
                        && cntr.find("div.spwidgets-item").length < 1
                        )
                    )
            ) {
                
                cntr.css("display", "none");
                
            }
            
            // If allowMultiples is false, and hideInput is true, then make sure
            // it is visible again
            if ( o.allowMultiples === false && o.hideInput === true ) {
                
                o._lookupInputEleCntr.css("display", "");
                
            }
            
            // If a message was defined for no items selected,
            // then show it now.
            if ( cntr.find("div.spwidgets-item").length < 1 && o.msgNoItems ) {
                
                cntr.append("<div>" + o.msgNoItems + "</div>");
                
            }
            
        });
        
        // Remove the deleted ID from the array and
        // store the remainder of the ID back into the
        // input field.
        for( i=0,j=items.length; i<j; i++ ){
            
            if ( items[i].id != id ) {
                
                store.push( items[i].id );
                
            }
            
        };  
        
        o.storeItemIDs( store );
        
        // Focus on the autocomplete field.
        o._lookupInputEleCntr.find("input").focus();
        
        return Lookup;
        
    };//end:Lookup.removeItem() 
    
    
    /**
     * @property
     * @memberOf    Lookup.lookupField
     * Stores the Style sheet that is inserted into the page the first
     * time lookupField is called.
     * Value is set at build time.
     * 
     */
    Lookup.styleSheet = "/**\n"
+ " * Stylesheet for the Lookup Field widget.\n"
+ " * \n"
+ " */\n"
+ "\n"
+ ".spwidgets-lookup-cntr {\n"
+ "    position: relative;\n"
+ "    display: inline-block;\n"
+ "    zoom: 1; /* IE7 hack */\n"
+ "    *display: inline; /* IE7 hack */\n"
+ "}\n"
+ "\n"
+ "\n"
+ ".spwidgets-lookup-cntr .spwidgets-lookup-selected {\n"
+ "    -moz-appearance: textfield;\n"
+ "    -webkit-appearance: textfield;\n"
+ "    background-color: white;\n"
+ "    background-color: -moz-field;\n"
+ "    border: 1px solid  darkgray;\n"
+ "    box-shadow: 1px 1px 1px 0 lightgray inset;  \n"
+ "    font: -moz-field;\n"
+ "    font: -webkit-small-control;\n"
+ "    margin-top: 5px;\n"
+ "    padding: 2px 5px; \n"
+ "}\n"
+ "\n"
+ ".spwidgets-lookup-cntr  .spwidgets-lookup-selected .spwidgets-item {\n"
+ "    display: inline-block;\n"
+ "    margin-left: .5em;\n"
+ "}\n"
+ ".spwidgets-lookup-cntr .spwidgets-item:first-child {\n"
+ "    margin-left: 0px;\n"
+ "}\n"
+ ".spwidgets-lookup-cntr .spwidgets-item-remove {\n"
+ "    color: red;\n"
+ "    cursor: pointer;\n"
+ "}\n"
+ "\n"
+ ".spwidgets-lookup-cntr .spwidgets-lookup-input {\n"
+ "    margin: .2em 0em;\n"
+ "    position: relative;\n"
+ "}\n"
+ ".spwidgets-lookup-cntr .ptLookupSPFieldSelector {\n"
+ "    height: 16px;\n"
+ "    width: 16px;\n"
+ "    text-indent: -99999px;\n"
+ "    background-repeat: no-repeat;\n"
+ "    background-image: url(\"/_layouts/images/ARRDOWNI.GIF\");\n"
+ "    display: inline-block;\n"
+ "}\n"
+ ".spwidgets-lookup-cntr .ptLookupSPFieldSelectorCntr {\n"
+ "    display: none;\n"
+ "    position: absolute;\n"
+ "    height: 150px;\n"
+ "    width: 98%;\n"
+ "    left: 0px;\n"
+ "    overflow: auto;\n"
+ "    z-index: 2000;\n"
+ "}\n"
+ ".spwidgets-lookup-cntr ul.ui-autocomplete {\n"
+ "    overflow: auto;\n"
+ "}\n"
+ "\n"
+ "/* Ready only display */\n"
+ ".spwidgets-lookup-cntr div.spwidget-lookup-readyonly .spwidgets-lookup-selected {\n"
+ "    -moz-appearance: none;\n"
+ "    -webkit-appearance: none;\n"
+ "    background-color: transparent;\n"
+ "    border: none;\n"
+ "    box-shadow: none;\n"
+ "    font: inherit;\n"
+ "}\n"
+ ".spwidgets-lookup-cntr div.spwidget-lookup-readyonly .spwidgets-item-remove {\n"
+ "    display: none;\n"
+ "}\n";
//_HAS_LOOKUP_CSS_TEMPLATE_;
    
    
    /**
     * @property
     * @memberOf    Lookup.lookupField
     * Stores the HTML template for each lookup field.
     * Value is set at build time.
     * 
     */
    Lookup.htmlTemplate = "<div>\n"
+ "    <div class=\"spwidgets-lookup-cntr\">\n"
+ "        <div class=\"spwidget-lookup\">\n"
+ "            <div class=\"spwidgets-lookup-selected\" style=\"display:none;\">\n"
+ "            </div>\n"
+ "            <div class=\"spwidgets-lookup-input\">\n"
+ "                <label>Add</label>\n"
+ "                <input type=\"text\" name=\"ptLookupSPFieldAdd\" value=\"\" />\n"
+ "                <span class=\"ptLookupSPFieldSelector\">Select</span>\n"
+ "                <div class=\"ptLookupSPFieldSelectorCntr ui-widget-content\">\n"
+ "                    <div style=\"height: 1000px;\"></div>\n"
+ "                </div>\n"
+ "            </div>\n"
+ "        </div>\n"
+ "    </div>\n"
+ "</div>\n"
+ "\n";
//_HAS_LOOKUP_HTML_TEMPLATE_
    

})(jQuery);
/**
 * @fileOverview jquery.SPControlPickUser.js
 * jQuery plugin that attaches to an input field and provide a people
 * picker widget for interaction by the user. This Plugin is dependent
 * on jQuery UI's Autocomplete and SPServices library.
 *      
 *  
 * @version 20130509065100NUMBER_
 * @author  Paul Tavares, www.purtuga.com
 * @see     TODO: site url
 * 
 * @requires jQuery.js {@link http://jquery.com}
 * @requires jQuery-ui.js {@link http://jqueryui.com}
 * @requires jquery.SPServices.js {@link http://spservices.codeplex.com}
 * 
 * Build Date May 09, 2013 - 06:51 PM
 * 
 */

/**
 * Namespace for pickSPUser specific methods.
 * @name        pickSPUser
 * @class       Namespace for pickSPUser plugin
 * @memberOf    jQuery.pt
 */
$.pt.pickSPUser = {
    _isPickSPUserCssDone: false
};

/**
 * Given an input field, this method will display an interface that
 * allows the users to select one or more users from SharePoint and
 * stores the selected user information into the intput field in the
 * format expected when making an update via webservices.
 * 
 * The input field will be hidden in its current position and a UI
 * will displayed instead. As the user picks or removes users, the
 * input field will be updated at the same time, thus it will always
 * be ready to be submitted as part of an update to the server.
 * 
 * @alias $.pickSPUser()
 * @alias jQuery.pickSPUser()
 * @alias $().pickSPUser()
 * @alias jQuery().pickSPUser()
 * 
 * 
 * @param {Object} options
 *                      Object with the options. See below.
 * 
 * @param {Boolean} [options.allowMultiples=true]
 *                      Determine whether multiple users can be picked.
 * @param {Interger} [options.maxSearchResults=50]
 *                      The max number of results to be returned from the
 *                      server.
 * @param {Function} [onPickUser]
 *                      Function that is called when user makes a selection.
 *                      Function will have a context (this keyword) of the
 *                      input field to which this plugin is called on, and
 *                      will be given one input param; an object containing
 *                      information about the selected user.  
 * 
 * @return {jQuery} selection
 * 
 * 
 * 
 * METHODS:
 * 
 * $().pickSPUser("method", "clear")    -   Clears the currently selected users.
 * 
 */
$.fn.pickSPUser = function(options) {
    
    // if the global styles have not yet been inserted into the page, do it now
    if (!$.pt.pickSPUser._isPickSPUserCssDone) {
        $.pt.pickSPUser._isPickSPUserCssDone = true;
        $('<style type="text/css">' + "\n\n" +
                $.pt.pickSPUser.styleSheet +
                "\n\n</style>")
            .prependTo("head");
    }
    
    // Store the arguments given to this function. Used later if the
    // user is trying to execute a method of this plugin.
    var arg = arguments;
    
    // Define options with globals
    // var options = $.extend({}, options2);
 
    // Initiate each selection as a pickSPUser element
    this.each(function(){
        var ele = $(this);
        if (!ele.is("input") || ele.hasClass("hasPickSPUser")){
            // if the first argument is a string, and this is an input
            // fild, then process methods
            if (typeof options === "string" && ele.is("input")) {
                return $.pt.pickSPUser.handleAction.apply(this, arg);
                
            // ELse, exit
            } else {
                return this;
            }
        };
        
        // Options for this element
        var o   = $.extend({},
                {
                    allowMultiples:     true,
                    maxSearchResults:   50,
                    onPickUser:         null
                },
                options, 
                {
                    eleUserInput: ele.css("display", "none").addClass("hasPickSPUser") 
                });

        // insure that maxsearchResults is an interger
        o.maxSearchResults = parseInt(o.maxSearchResults) || 50;
        
        // Create pick user container and insert it after the input element
        // TODO: Clean up
        // var cntr        = $(o.htmlTemplateSelector + " .pt-pickSPUser")
                            // .clone(1).insertAfter(ele);
        var cntr        = $($.pt.pickSPUser.htmlTemplate)
                            .find(".pt-pickSPUser").clone(1).insertAfter(ele);
        o.eleSelected   = cntr.find("div.pt-pickSPUser-selected").empty();
        
        o.elePickInput  = cntr.find("div.pt-pickSPUser-input");
        
        // If multiple user are allowed to be picked, then add style to
        // selected input area
        if (o.allowMultiples === true) {
            o.eleSelected.addClass("pt-pickSPUser-selected-multiple");
        }
        
        // If the current input field has a value defined, then parse it
        // and display the currently defined values
        if (ele.val()) {
            var curUsers = new String(ele.val()).split(';#'); 
            var total = curUsers.length;
            for (var i=0; i<total; i++){
                var id = curUsers[i];
                i++;
                var user    = curUsers[i];
                o.eleSelected.append($.pt.pickSPUser.getUserHtmlElement(o, id, user));
            }
            $.pt.addHoverEffect(
                o.eleSelected.find("div.pt-pickSPUser-person-cntr") );
        
            // if we don't allow multiple, then hide the input area
            if (o.allowMultiples === false) {
                o.elePickInput.css("display", "none");
            }
        }
        
        // Variable that store all search results
        var cache = {};
        
        // Add the AutoComplete functionality to the input field
        o.elePickInput.find("input[name='pickSPUserInputField']")
            .autocomplete({
                minLength: 3,
                source: function(request, response){
                    // If search term is in cache, return it now
                    if (request.term in cache) {
                        response(cache[request.term]);
                        return;
                    }
                    cache[request.term] = [];
                    
                    // Search SP
                    $().SPServices({
                        operation:      "SearchPrincipals",
                        searchText:     request.term,
                        maxResults:     o.maxSearchResults,
                        async:          true,
                        completefunc:   function(xData, status){
                            $(xData.responseXML).find("PrincipalInfo").each(function(){
                                var thisEle = $(this);
                                cache[request.term].push({
                                    displayName:    thisEle.find("DisplayName").text(),
                                    accountId:      thisEle.find("UserInfoID").text(),
                                    accountName:    thisEle.find("AccountName").text(),
                                    accountType:    thisEle.find("PrincipalType").text(),
                                    // needed attributes for autocomplete
                                    value:          thisEle.find("DisplayName").text(),
                                    label:          thisEle.find("DisplayName").text()
                                });
                            });
                            // insert items for Autocomplete
                            
                            // Add to cache
                            response(cache[request.term]);
                        }
                    });
                },//end:source()
                /**
                 * Event bound to an autocomplete suggestion.
                 * 
                 * @param {jQuery} ev   -   jQuery event.
                 * @param {Object} u    -   An object containing the element generated above
                 *                          by the <source> method that represents the person
                 *                          that was selected.
                 */
                select: function(ev, u){
                    // If we store only 1 user, then clear out the current values
                    if (o.allowMultiples === false) {
                        o.eleSelected.empty();
                    }
                    o.eleSelected.append(
                        $.pt.pickSPUser.getUserHtmlElement(
                            o, u.item.accountId, u.item.displayName));
                    $.pt.pickSPUser.storeListOfUsers(cntr);
                    $.pt.addHoverEffect(
                        cntr.find("div.pt-pickSPUser-person-cntr") );
                    // clear out the autocomplete box
                    setTimeout(function(){ev.target.value = "";}, 50);
                    if (o.allowMultiples === false) {
                        o.elePickInput.hide();
                    }
                    // if a callback was defined, call it now
                    if ($.isFunction(o.onPickUser)) {
                        o.onPickUser.call(o.eleUserInput, $.extend({},u.item));
                    }
                }
            });//end:autocomplete 
        
        // Store the options for this call on the container and include a pointer
        // in the input field to this element
        cntr.data("pickSPUserContainerOpt", o);
        ele.data("pickSPUserContainer", cntr);
        
        return this;
    });
    
    return this;
    
};// $.fn.pickSPUser()

/**
 * Builds the html element that surrounds a user for display on the page.
 * 
 * @param {Object} opt     -   The options object given to <jQuery.fn.pickSPUser()>
 * @param {String} id      -   The User's Sharepoint UID
 * @param {String} name    -   The User's name.
 * 
 * @return {jQuery} Html element
 * 
 */
$.pt.pickSPUser.getUserHtmlElement = function(opt, id, name){
    // TODO: clean up
    // var ele = $(opt.htmlTemplateSelector + " .pt-pickSPUser-person").clone(1);
    var ele = $($.pt.pickSPUser.htmlTemplate)
                .find(".pt-pickSPUser-person").clone(1);
    ele.attr("data-pickSPUserID", id);
    ele.find("span.pt-person-name")
            .append(name)
            .end()
        .attr("data-pickSPUserNAME", name);
    return ele;    
    
};// $.pt.pickSPUser.getUserHtmlElement()


/**
 * Method is bound to the X (remove) button that appears when the one 
 * hovers over the names curerntly displayed. Removes the user from
 * the UI and updates the input field to reflect what is currently
 * displayed. 
 * 
 * @param {Object} ele -   The HTML element from where this method was
 *                         called. Used to find both the div.pt-pickSPUser
 *                         overall parent element as well as the specific
 *                         .pt-pickSPUser-person element for the user that
 *                         was clicked on.
 * 
 * @return {undefined}
 * 
 */
$.pt.pickSPUser.removeUser = function(ele){
    
    var cntr    = $(ele).closest("div.pt-pickSPUser");
    var o       = cntr.data("pickSPUserContainerOpt");
    
    // remove user from the view
    $(ele).closest("div.pt-pickSPUser-person").fadeOut('fast', function(){
        $(this).remove();
        $.pt.pickSPUser.storeListOfUsers(cntr);
    });
    
    // if AllowMultiple is false, then make the picker input visible
    if (o.allowMultiples === false) {
        o.elePickInput.show("fast", function(){
            o.elePickInput.find("input").focus();
        });
    }
    
    return;
};// $.pt.pickSPUser.removeUser()


/**
 * Method will look at the container that holds the currently selected
 * users and will populate the initial input field given to
 * <jQuery.fn.pickSPUser()> with a sting representing those users.
 *   
 * 
 * @param {Object} ele -   The HTML element from where this method was
 *                         called. Used to find both the div.pt-pickSPUser
 *                         overall parent element as well as the specific
 *                         .pt-pickSPUser-person element for the user that
 *                         was clicked on.
 * 
 * @return {undefined}
 * 
 */
$.pt.pickSPUser.storeListOfUsers = function(ele){
    
    var cntr    = $(ele).closest("div.pt-pickSPUser"),
        opt     = cntr.data("pickSPUserContainerOpt"),
        newVal  = "",
        // isDone: keep track of the user already selected,
        // so we don't add them twice to the input field.
        isDone  = {}; 
    
    cntr.find("div.pt-pickSPUser-selected div.pt-pickSPUser-person")
        .each(function(){
            if (isDone[$(this).attr("data-pickSPUserID")]) {return;};
            isDone[$(this).attr("data-pickSPUserID")] = true;
            if (newVal) {
                newVal += ";#";
            }
            newVal += $(this).attr("data-pickSPUserID");
            newVal += ";#";
            newVal += $(this).attr("data-pickSPUserNAME");
        });
    opt.eleUserInput.val(newVal);
    
    return;
};// $.pt.pickSPUser.storeListOfUsers()

/**
 * Handles method actions given to $().pickSPUser()
 * 
 * @param {String} type
 * @param {String} action
 * @param {Object} options
 * 
 * @return {this}
 * 
 */
$.pt.pickSPUser.handleAction = function(type, action, options) {
    
    type    = String(type).toLowerCase();
    action  = String(action).toLowerCase();
    
    o = $(this).data("pickSPUserContainer").data("pickSPUserContainerOpt");
    
    if (type === "method") {
        if (action === "clear") {
            o.eleUserInput.val("");
            o.eleSelected.empty();
            if (o.allowMultiples === false) {
                o.eleSelected.css("display", "none");
                o.elePickInput.show();
            }
        }
        if (action === "destroy"){
            if ( $(this).hasClass('hasPickSPUser')) {
                $(this).removeClass('hasPickSPUser')
                        .next('.pt-pickSPUser').remove()
                        .show()
                        .trigger('change'); //trigger is for knockoutJS.
            }

        }
    }//end:type===method
    
    return this;
};// $.pt.pickSPUser.handleAction() 


/**
 * @property
 * Stores the Style sheet that is inserted into the page the first
 * time pickSPUser is called.
 * Value is set at build time.
 * 
 */
$.pt.pickSPUser.styleSheet = "/**\n"
+ " * Styles for the Pick User Widget\n"
+ " */\n"
+ ".pt-pickSPUser .pt-pickSPUser-selected-multiple {\n"
+ "    min-height: 3em;\n"
+ "}\n"
+ "\n"
+ ".pt-pickSPUser .pt-pickSPUser-selected .pt-pickSPUser-person {\n"
+ "    float: left;\n"
+ "    margin-left: .2em;\n"
+ "}\n"
+ ".pt-pickSPUser .pt-pickSPUser-hint {\n"
+ "    font-size: .9em;\n"
+ "}\n"
+ "\n"
+ "\n"
+ ".pt-pickSPUser .pt-pickSPUser-person-cntr {\n"
+ "    margin: .2em 0em;\n"
+ "    padding: .2em;\n"
+ "    position: relative;\n"
+ "}\n"
+ "\n"
+ ".pt-pickSPUser .pt-pickSPUser-person-cntr .pt-person-name {\n"
+ "    padding-right: 2em;\n"
+ "}\n"
+ "\n"
+ "/* Item action container (delete button) */\n"
+ ".pt-pickSPUser .pt-pickSPUser-person-cntr .pt-pickSPUser-person-actions {\n"
+ "    position: absolute;\n"
+ "    right: 1px;\n"
+ "    top: 1px;\n"
+ "    padding: .2em;\n"
+ "    display: none;\n"
+ "}\n"
+ ".pt-pickSPUser .pt-pickSPUser-person-cntr .pt-pickSPUser-person-actions .pt-pickSPUser-person-action-links,\n"
+ ".pt-pickSPUser .pt-pickSPUser-person-cntr .pt-pickSPUser-person-actions .pt-pickSPUser-person-action-links .tt-confirm-delete {\n"
+ "    float:right;\n"
+ "}\n"
+ "\n"
+ "/* Make the action visible if we hover or we are trying to confirm a deletion */\n"
+ ".pt-pickSPUser .pt-pickSPUser-person-cntr.ui-state-hover .pt-pickSPUser-person-actions,\n"
+ ".pt-pickSPUser .pt-pickSPUser-person-cntr .pt-pickSPUser-person-actions.tt-confirm,\n"
+ ".pt-pickSPUser .pt-pickSPUser-person-cntr .pt-pickSPUser-person-actions a {\n"
+ "    display:block;\n"
+ "    float: right;\n"
+ "}\n"
+ "\n"
+ "/* autocomplete busy image */\n"
+ ".ui-autocomplete-loading {\n"
+ "    background: white url('/_layouts/images/loading.gif') right center no-repeat;\n"
+ "}\n"
+ "\n"
+ "\n";
//_HAS_PICKSPUSER_CSS_TEMPLATE_


/**
 * @property
 * Stores the HTML template for each people picker.
 * Value is set at build time.
 * 
 */
$.pt.pickSPUser.htmlTemplate = "<!--\n"
+ "    Html Templates for the PickSPUser plugin.\n"
+ "    \n"
+ "    |\n"
+ "    |   $Author$\n"
+ "    | $Revision$\n"
+ "    |     $Date$\n"
+ "    |       $Id$\n"
+ "    |\n"
+ "-->\n"
+ "<div>\n"
+ "    <div class=\"pt-pickSPUser\">\n"
+ "        <div class=\"pt-pickSPUser-selected\">\n"
+ "            None Selected!\n"
+ "        </div>\n"
+ "        <div style=\"clear:both\"></div>\n"
+ "        <div class=\"pt-pickSPUser-input\" \n"
+ "                title=\"Type user name above to view search results.\">\n"
+ "            <input name=\"pickSPUserInputField\" value=\"\" />\n"
+ "        </div>\n"
+ "    </div>\n"
+ "    \n"
+ "    <div class=\"pt-pickSPUser-person\">\n"
+ "        <div class=\"pt-pickSPUser-person-cntr ui-state-default ui-corner-all\">\n"
+ "            <span class=\"pt-person-name\"></span>\n"
+ "            <div class=\"pt-pickSPUser-person-actions\">\n"
+ "                <div class=\"tt-record-item-action-links\">\n"
+ "                    <a class=\"tt-delete-icon\" href=\"javascript:\" onclick=\"jQuery.pt.pickSPUser.removeUser(this);\">\n"
+ "                        <img style=\"border: medium none; margin-right: 2px;\" alt=\"Delete\" src=\"/_layouts/images/delitem.gif\">\n"
+ "                    </a>\n"
+ "                    <div style=\"clear:both;\"></div>\n"
+ "                </div>\n"
+ "                <div style=\"clear:both;\"></div>\n"
+ "            </div>\n"
+ "        </div>\n"
+ "    </div>\n"
+ "</div>\n";
//_HAS_PICKSPUSER_HTML_TEMPLATE_

/**
 * Given a list of elements, this will add a hover affect to 
 * those elements by toggling some classes from jQuery UI
 * 
 * @memberof jQuery.pt
 * 
 * @param {jQuery|String} ele   A jQuery selector or object containing
 *                              the list of elements to receive the hover
 *                              effect.
 * @return {jQuery}
 * 
 * @example
 * 
 *      $(".tt-hover-animate").addHoverEffect();
 *      $(".container a").addHoverEffect();
 * 
 */
$.pt.addHoverEffect = function(ele){
    return $(ele).each(function(){
            if ($(this).hasClass("addHoverEffectDone")) {
                return;
            } else {
                $(this).addClass("addHoverEffectDone");
            };
            var e = this;
            $(e).mouseenter(function(){$(e).toggleClass("ui-state-hover");});
            $(e).mouseleave(function(){$(e).toggleClass("ui-state-hover");});
        });
};// $.pt.addHoverEffect()



/**
 * @fileOverview jquery.SPControlUpload.js
 * jQuery plugin that interacts with Sharepoint built in Upload.aspx through an iframe
 * to provide to the user an upload UI without leaving actually leaving the page, thus
 * simulating an ajax file upload interaction.
 * Currently used to upload files to a Document Library with out having the user go
 * through the many SP pages and without having to leave the user's current page.
 *      
 *  
 * @version 20130509065100NUMBER_
 * @author  Paul Tavares, www.purtuga.com
 * @see     TODO: site url
 * 
 * @requires jQuery.js {@link http://jquery.com}
 * @requires jQuery-ui.js {@link http://jqueryui.com}
 * @requires jquery.SPServices.js {@link http://spservices.codeplex.com}
 * 
 * Build Date May 09, 2013 - 06:51 PM
 * 
 */

/**
 *  jQuery definition
 *  @see    http://jquery.com/
 *  @name   jQuery
 *  @class  jQuery Library
 */

/**
 * jQuery 'fn' definition to anchor all public plugin methods.
 * @see         http://jquery.com/
 * @name        fn
 * @class       jQuery Library public method anchor
 * @memberOf    jQuery
 */

/**
 * Tracks if the CSS injection into the page has been done.
 */
$.pt._isSPUploadCssDone = false;


/**
 * jQuery plugin that populates the elements selected with a UI for
 * uploading a file to a Sharepoint location (library) without having
 * to leave the current page that the user is currently on.
 * 
 * @param {Object} options  Object with the options below.
 * 
 * @param {String} options.listName REQUIRED. The name or UID of the list.
 *                  Example 'Shared Documents' or '{67587-89284-93884-78827-78823}'
 * 
 * @param {String} [options.folderPath="/"]
 *                  Optional. The full path to the folder inside of the List where
 *                  the document should be uploaded to. Default is to place the
 *                  document at the root of the Document Library
 *                  Examples 'http://yourdomain.com/sites/site1/Shared Documents' or
 *                  '/sites/site1/Shared Documents'
 * 
 * @param {String} [options.uploadDonePage="/_layouts/viewlsts.aspx"]
 *                  Optional. The url of the page that should be loaded after the
 *                  file has been uploaded successful. Value MUTST start with http.
 *                  Default is 'http://yourdomain.com/sites/site1/_layouts/viewlsts.aspx'
 * 
 * @param {Funtion} [options.onPageChange=null]
 *                  Function that is called each time the form in the
 *                  iFrame is changed. The function 'this' keyword points to the
 *                  element that was used when this method was called. The function
 *                  is given one param; the event object created by this method.
 *                  ({@link SPControlLoadEvent})
 *                  Return value of this function will control flow of plugin.
 *                  Returning true (boolean), will allow processing to continue
 *                  at different stages (see the event object below), while 
 *                  returnin false (boolean) will stop flow from continuing. The
 *                  check is strict; meaning that it has to be a boolean false in
 *                  order for flow to stop. 
 * 
 * @param {String} [options.uploadUrlOpt=""]
 *                  String of data that should be appended to the upload page url,
 *                  following this '?". 
 *                  NOTE; The option "MultipleUpload=1" is NOT SUPPORTED.
 *                  This string value is assumed to have already been properly 
 *                  escaped for use in the url.
 * 
 * @param {Boolean} [options.overwrite=False]
 *                  True or False indicating if document being uploaded should
 *                  overwrite any existing one. Default is False (don't overwrite)
 * 
 * @param {String} [options.uploadPage="/_layouts/Upload.aspx"]
 *                  The relative URL from the WebSite root to the upload page.
 *                  Default is "/_layouts/Upload.aspx". This value is appended to
 *                  to the website full url, which is retrieved using SPServices
 *                  utility.
 * 
 * @param {String} [options.overlayClass=""]
 *                  A css class to be associated with the overlay that is displayed
 *                  over the iframe while loading of the page is going on.
 * 
 * @param {String} [options.overlayBgColor="white"]
 *                  A color to be used for the overlay area that is displayed over
 *                  the iframe wile loading of the page is going on. Default is
 *                  white. Set this to null if wanting only to use a class.
 * 
 * @param {String|HTMLElement|jQuery} [options.overlayMessage="Loading..."]
 *                  String or object/element to be displayed inside of the overlay
 *                  when it is displayed. Default is "Loading..."
 * 
 * @return {jQuery}
 * 
 * @example
 *  
 *  $("&lt;di&gt;&lt;/div&gt;").appendTo("body")
 *      .SPControlUpload({
 *          listName: "Shared Documents"
 *      }); 
 * 
 * 
 */
$.fn.SPControlUpload = function (options) {
    var o = $.extend({}, {
                listName:       '',
                folderPath:     '',
                uploadDonePage: '/_layouts/viewlsts.aspx',
                onPageChange:   null,
                uploadUrlOpt:   '',
                overwrite:      false,
                uploadPage:     '/_layouts/Upload.aspx',
                overlayClass:   '',
                overlayBgColor: 'white',
                overlayMessage: '<div class="loadingOverlayMsg">Loading...</div>'
            }, options);
    
    // if the global styles have not yet been inserted into the page, do it now
    if (!$.pt._isSPUploadCssDone) {
        $.pt._isSPUploadCssDone = true;
        $('<style type="text/css">' + "\n\n" +
        $.pt.SPUploadStyleSheet + "\n\n</style>").prependTo("head");
    }
    
    // If list Name is not the UID, then get it now
    if (o.listName && o.listName.indexOf("{") != 0) {
        o.listName = $.pt.getListUID(o.listName);
    }
    // If list name is not defined - error
    if (!o.listName) {
        $(this).html('<div class="ui-state-error">Input parameter [listName] not valid!</div>');
        return this;
    }

    // get current site URL
    // TODO: use WebUrlFromPageUrl to get the url baed on siteUrl
    o.siteUrl       = $().SPServices.SPGetCurrentSite();
    
    // set the url of the upload page based on the siteUrl
    if (String(o.uploadPage).toLowerCase().indexOf("http") == -1) {
        var s = "/";
        if (o.uploadPage.indexOf('/') == 0) {
            s = "";
        }
        o.uploadPage = o.siteUrl + s + o.uploadPage;
    }
    // Set the uploadDonePage url
    if (String(o.uploadDonePage).toLowerCase().indexOf("http") == -1) {
        var s = "/";
        if (o.uploadDonePage.indexOf('/') == 0) {
            s = "";
        }
        o.uploadDonePage = o.siteUrl + s + o.uploadDonePage;
    }
    
    // Create additional non-overridable options
    o.uploadPage    = o.uploadPage + "?List=" + 
                      $.pt.getEscapedUrl(o.listName) + "&RootFolder=" +
                      $.pt.getEscapedUrl(o.folderPath) + "&Source=" +
                      $.pt.getEscapedUrl(o.uploadDonePage) + "&" + o.uploadUrlOpt;
    o._lastError    = "";
    o._reloadCount  = 0;
   
    /** 
     * @name SPControlLoadEvent
     * Event object that is given as input to the function defined in the
     * $.fn.SPControlUpload-onPageChange parameter.
     * 
     * @event
     * @memberof $.fn.SPControlUpload
     * 
     * @param {SPControlLoadEvent} ev
     * 
     * @param {Integer} ev.state
     *          A value from 1 through 3 that represents the state of
     *          the file upload form.
     *          1 = is set when the form is initially loaded and the 
     *          File html element is ready for the user to attach the file.
     *          File has not yet been uploaded.
     *          2 = is set when the form is ready to be submitted to the server
     *          along with the file set by the user. File has not yet been
     *          uploaded.
     *          3 = is set when the user has successfully uploaded the file to
     *          the server and no errors were encountered.
     *          File has been uploaded and now sits on the server.
     * 
     * @param {String} ev.action
     *          The event action as it pertains to this plugin. 
     *          preLoad        =    action is taking place before the page is sent
     *          to the server.
     *          postLoad    =    action is taking place after page has completed
     *          loading, but is not yet "visible" to the user.
     * 
     * @param {Boolean} ev.hideOverlay
     *          Used when action=postLoad. Can be set by
     *          a callback function to false, so that the busy overlay remains
     *          displayed and is not automaticaly hidden. Default value is "true".
     * 
     * @param {String} ev.pageUrl
     *          The url of the page currently loaded in the iframe.
     * 
     * @param {jQuery} ev.page
     *          An object representing the page loaded inside the
     *          iFrame. This can be used to further manipulate the iframe's
     *          page content.
     * 
     * @param {Boolean} ev.isUploadDone
     *          Indicates if the upload process is done. Basically,
     *          this means that the processess has reached the page defined
     *          in the updatePageDone parameter.
     * 
     */
    o.ev            = {
        state:          1,
        action:         "uploading",
        hideOverlay:    true,
        pageUrl:        "",
        page:           null, // a jquery object
        isUploadDone:   false
    };
    
    var overlayStyle = "";
    if (o.overlayBgColor) {
        overlayStyle = "style='background-color:" + o.overlayBgColor + ";' ";
    }
    
    $(this).each(function(){
        
        // Create the UI on the element given used by the SPCOntrolUpload plugin
        var e = $(this);
        var h = (e.outerHeight() - 75);
        var c = {
            top:        0, //e.offset().top
            left:       0, //e.offset().left
            height:     e.outerHeight(true) - 15,
            display:    "block"
        };
        
        e.empty()
            .addClass("hasSPControlUploadUI")
            .append("<div class='SPControlUploadUI spcontrolupload'>" +
                "<div class='mainContainer'><div class='iFrameWindow'>" +
                "<iframe name='SPControlUploadUI' frameborder='0' scrollbars='yes' " +
                "scrolling='yes'></iframe></div><div class='buttonPane'>" + 
                "<button type='button' class='ui-state-default' " +
                "name='upload_button' value='upload' onclick='$.pt._onUpload(this);'>" +
                "Upload</button></div><div class='loadingOverlay " + o.overlayClass + 
                "' " + overlayStyle + "></div></div></div>" )
            .find(".SPControlUploadUI")
                .data("SPControlUploadOptions", o)
                .end()
            .find("iframe")
                .css("height", h)
                .load(function(ev){
                    $.pt._onIFramePageChange(e.find(".SPControlUploadUI"));
                })
                .attr("src", o.uploadPage)
                .end()
            .find(".loadingOverlay")
                .append(o.overlayMessage)
                .css(c);
                
        return this;
    });//each()

    return this;
    
};// $.fn.SPControlUpload
    
/**
 * FUNCTION: $.pt._onUpload()
 * 
 *  Submits the upload form that is loaded in the iframe window.
 *  Also calls any callback function defined by the user.
 * 
 * PARAMS:
 * 
 *  @param {Object} ele -   Element from within the 
 *                          .SPControlUploadUI class html container
 * 
 * RETURN:
 * 
 *  @return {undefined} Nothing.
 *
 */
$.pt._onUpload = function(ele){
    var e       = $(ele).closest(".SPControlUploadUI");
    var page    = e.find("iframe").contents();
    var msgs    = page.find("input[type='file']").closest("tr").siblings().find("span");
    var o       = e.data("SPControlUploadOptions");
    var ev      = o.ev;
    
    // Insure all messages are initially hidden (these might have been
    // visible from any prior call to upload the document where it failed.)
    msgs.css("display", "none");
    
    // If no file was entered, then there is nothing to upload.
    if (!page.find("input[type='file']").val()) {
        return;
    }
    
    // Set the event info
    // TODO: Look into building the event with $.Event("ev name here")
    ev.state    = 2;
    ev.action   = "preLoad";
    
    // if a user function was defined, then call it now and give it the event
    // object defined above.
    // If fucntion returns a boolean false, then we exit here and never submit
    // the form.
    if (o.onPageChange) {
        if (o.onPageChange.call(e.closest(".hasSPControlUploadUI"), ev) === false){
            return false;
        }
    }
    
    // Hide the upload button, and Submit the form
    e.find(".buttonPane")
            .css("display", "none")
            .end()
        .find(".loadingOverlay")
            .fadeIn("slow", function(){
                page.find("input[type='button'][id$='btnOK']").click();

                // If error message are displayed (after we click upload button), 
                // then just return control back to the user.
                if (msgs.is(":visible")) {
//                    console.debug("_onUpload() msgs.is(visible) return true. showing button pane.");
                    e.find(".loadingOverlay")
                            .css("display", "none")
                            .end()
                        .find(".buttonPane")
                            .show(0)
                            .end();
                    return false;
                }
            });
    
};//* $.pt._onUpload()


/**
 * FUNTION: $.pt._onIFramePageChange()
 * 
 *  Called when ever the iframe is "load"ed. Function is bound to
 *  the iframe html element's _load event so that it is called each
 *  time the content of the iframe (the page) is reloaded. 
 * 
 * PARAMS:
 * 
 *  @param {jQuery} ele -   jQuery object representing the .SPControlUploadUI
 *                          element.
 * 
 * RETURN:
 * 
 *  @return {undefined} nothing.
 * 
 */
$.pt._onIFramePageChange = function(ele){
    
    var e       = $(ele).closest(".SPControlUploadUI"),
        page    = e.find("iframe").contents(),
        opt     = e.data("SPControlUploadOptions"),
        ev      = opt.ev;
    
    ev.pageUrl  = page[0].location.href;
    ev.page     = page;
    
//    console.debug("$.pt._onIFramePageChange(): In...");
    
    // Because just about every browser differs on how the load() event
    // is triggered, we do all our work in a function that is triggered
    // 500 millisends from now. By then, the page (regardless of browser)
    // should be in a state that is useful.
    setTimeout(
        function(){

            // If the URL of the page in the iFrame is the same as the 
            // upload page then this is either the
            // initial load of the page or an error has occured...
            // Hide the page and show only the upload form element.
            if ($.pt.isSameUrlpage(
                    $.pt.getUnEscapedUrl(ev.pageUrl),
                    $.pt.getUnEscapedUrl(opt.uploadPage))
            ) {
//                console.debug("_onIFramePageChange() URL is the same as the one originally requested.");
                
                page.find("form").children(":visible").hide();
                page.find("form").append(
                        "<div id='SPControlUploadModUI' style='position:"
                    +    "absolute;width:99.9%;height:99.9%x;left:0px;top:0px;"
                    +    "background-color:white;padding-top:3em;'></div>");
                
                // Is the page displaying an error page without the upload interface?
                // Capture error message and reload the page.
                // SP2010 Seems to behave differntly and land display errors a little
                // differently... so we try the <title> tag adn then the form action value. 
                if (    new RegExp(/error/i).test($.trim(page.find(".ms-pagetitle").text()))
                    ||  new RegExp(/error/i).test($.trim(page.find("title").text()))
                    ||  new RegExp(/error\.aspx/i).test($.trim(page.find("form").attr("action")))
                ) {
//                    console.debug("_onIFramePageChange() page displaying an error... Storing it and reloading upload form.");
                    
                    opt._lastError = page.find("[id$='LabelMessage']").text();
                    
                    // Lets avoid looping... Dont if it possible, but just in case.
                    if (opt._reloadCount > 1) {
                        alert("Error encountered during upload which is causing program to loop. Last upload error was: " + opt._lastError);
                        e.find(".loadingOverlay").fadeOut();
                        return;
                    }
                    
                    opt._reloadCount += 1;
                    e.find("iframe").attr("src", opt.uploadPage);
                    return;
                    
                // Not an error page.... 
                // Prepare the page for display to the user
                } else {
                    
                    // SP2010 Code
                    // If this is the new SP2010 "Processing..." page, then
                    // the just exit... there is nothing for us to do yet...
                    if (page.find("#GearPage") && !page.find("input[type='file']").length) {
//                        console.debug("_onIFramePageChange() SP2010 processing page... Exiting and waiting for next page...");
                        return;
                    }
                    
                    page.find("input[type='file']")
                        .closest("table")
                            .appendTo(page.find("#SPControlUploadModUI"))
                            .removeClass("ms-authoringcontrols")
                            .find("a[id$='UploadMultipleLink']")
                                .closest("tr")
                                    .css("display", "none")
                                    .end()
                                .end()
                            .find("input[type='checkbox'][name$='OverwriteSingle']")
                                .closest("tr")
                                    .css("display", "none")
                                    .end()
                                .end()
                            .find(".ms-fileinput")
                                .css("font-size", "13pt");
                    
                    // If there were any errors found during a previous call, then 
                    // display them now
                    if (opt._lastError) {
                        page.find("input[type='file']")
                            .after('<div style="color:red;"><div class="ui-state-error">ERROR: '
                                +    opt._lastError + '</div></div>');
                        opt._lastError = "";
                    }
                    opt._reloadCount = 0;
                    
                    // Set the override checkbox
                    if (opt.overwrite) {
                        page.find("input[type='checkbox'][name$='OverwriteSingle']")
                            .prop("checked", "checked");
                    } else {
                        page.find("input[type='checkbox'][name$='OverwriteSingle']")
                            .prop("checked", "");
                    }
                    
                    // Make sure the buttons are displayed and set proper event 
                    // param (for user defined functions)
//                    console.debug("_onIFramePageChange() Making buttons panel visible. state[1], action[postload], showoverlay[true].");
                    e.find(".buttonPane").show();
                    ev.state        = 1;
                    ev.action        = "postLoad";
                    ev.hideOverlay    = true;
                    
                }/* if: error page or upload UI? */
                
            // Else, we must be passed the upload page... 
            // set the state to 3 (passed upload) and bind a function to the
            // iframe document's form element (which in turn calls the user defined 
            // onPageChange event prior to sending the form on.
            } else {
                ev.state            = 3;
                ev.action           = "postLoad";
                ev.hideOverlay      = true;
                var form            = page.find("form").eq(0);
                var formOnSubmit    = form.prop("onsubmit");
                
                // If the current page is the 'uploadDonePage', then set
                // flag in the event, set flag to not hide the overlay
                // and insert message indicating upload is done.
                if ($.pt.isSameUrlpage(ev.pageUrl, opt.uploadDonePage)) {
                    ev.isUploadDone = true;
                    ev.hideOverlay  = false;
                    e.find(".loadingOverlay")
                        .empty()
                        .append('<div class="ui-state-highlight" style="width:80%;">' +
                                'Upload Complete!</div>');
                }
                
//                console.debug("_onIFramePageChange(): Binding function to form!");
                
                // SP seems to have a good hold of the Form, because
                // we are unable o bind an event via $. Thus:
                // The form's onsubmit has to be overriden with our
                // own function... The original function was captured
                // above, thus it will triggered... but we now control
                // when we trigger it.
                form[0].onsubmit = function(){

//                    console.debug("_onIFramePageChange(): in custom onsubmit... ");
                    
                    // Show the overlay without animation.
                    e.find(".loadingOverlay").css("display", "block");
                    
                    var allowFormToContinue = true;
                    
                    // if the user defined a function, then run it now and
                    // exit if the resposne is false (stop submition)
                    if ($.isFunction(opt.onPageChange)) {
                        allowFormToContinue = opt.onPageChange.call(
                                    e.closest(".hasSPControlUploadUI"),
                                    $.extend({}, ev, {state: 3, action: "preLoad"}));
                    }
                    if (allowFormToContinue === false) {
                        e.find(".loadingOverlay").fadeOut();
                        return allowFormToContinue;
                    };
                    
                    // if SP had a onSubmit defined, then execute it now and 
                    // exit if the resposne is false (stop submition)
                    if ($.isFunction(formOnSubmit)) {
                        allowFormToContinue = formOnSubmit();
                    }
                    if (allowFormToContinue === false) {
                        e.find(".loadingOverlay").fadeOut();
                        return allowFormToContinue;
                    };

                    // Return true, allowing the form to be submitted.
                    return allowFormToContinue;
                    
                };

                              
                // Bind a function to the iframe WINDOW object for when it is
                // unloaded.. At this point, nothing can be done to prevent
                // the page from being submitted, but we can still execute
                // the caller's function. 
                $(e.find("iframe")[0].contentWindow).unload(function(evv){
                    
                    // Make the busy panel visible without animation
                    e.find(".loadingOverlay").css("display", "block");
                    
                    if ($.isFunction(opt.onPageChange)) {
                        return opt.onPageChange
                            .call(
                                e.closest(".hasSPControlUploadUI"),
                                $.extend({}, ev, {state: 3, action: "preLoad"}) );
                    }
                });
                
            }//end:if
            
            // Call user event function    
            if (opt.onPageChange) {
                opt.onPageChange.call(e.closest(".hasSPControlUploadUI"), ev);
            }
            // Hide our overlay area
            if (ev.action.toLowerCase() != "postload" || ev.hideOverlay == true) {
                e.find(".loadingOverlay").fadeOut();
            }
            return;
        },
        500);//end:setTimeout()

};// $.pt._onIFramePageChange

/**
 * Determines whether two URLs are the same page. URLs could be the same page, but
 * have difference url params. This function will look only at the page (eveything
 * up to the "?") and will then compare them.
 * 
 * @param {String} u1   First URL
 * @param {String} u2   Second URL
 * @return {Boolean}
 * @memberOf jQuery.pt
 *
 */
$.pt.isSameUrlpage = function(u1, u2) {
    if (!u1 || !u2) { return false; }
    var matchString = u1;
    if (u1.indexOf("?") > -1) {
        matchString = u1.substring(0, u1.indexOf("?"));
    }
    if (u2.indexOf(matchString) == 0) {
        return true;
    } else {
        return false;
    }
};// $.pt.isSameUrlpage()


/**
 * Uses sharepoint default function for escaping urls.
 * @function
 */
$.pt.getEscapedUrl = escapeProperly;

/**
 * Uses sharepoint default function to un-escape urls.
 * @function
 */
$.pt.getUnEscapedUrl = unescapeProperly;


/**
 * Given a List name or a DOcument Library name, this method will retrieve
 * it's UID from SP.
 *
 * @param {String} listName     The name of the list.
 * @return {String}
 * @memberOf jQuery.pt
 *
 */
$.pt.getListUID = function(listName) {
    if (!listName) {
        return "";
    }
    var id = "";
    if ($.pt._cache["getListUID:" + listName]) {
        id = $.pt._cache["getListUID:" + listName];
        return id;
    }
    $().SPServices({
        operation: "GetList",
        listName: listName,
        async: false,
        completefunc: function (xData, Status) {
            id = $(xData.responseXML).find("List").attr("ID");
        }
    });
    if (id) {
        $.pt._cache["getListUID:" + listName] = id;
    }
    return id;
    
};// $.pt.getListUID()

/**
 * @property
 * Stores the Style sheet that is inserted into the page the first
 * time SPControlUpload is called.
 * Value is set at build time.
 * 
 */
$.pt.SPUploadStyleSheet = "/**\n"
+ " * FILE: jquery.SPControlUpload.css\n"
+ " * \n"
+ " * \n"
+ " */\n"
+ ".spcontrolupload .mainContainer {\n"
+ "	position: relative;\n"
+ "	display:block;\n"
+ "}\n"
+ ".spcontrolupload iframe {\n"
+ "	overflow: auto;\n"
+ "	width: 99%;\n"
+ "	height: 99%;\n"
+ "}\n"
+ ".spcontrolupload iframe .ms-fileinput {\n"
+ "	font-size:14pt;\n"
+ "}\n"
+ "\n"
+ ".spcontrolupload .buttonPane {\n"
+ "	display: none;\n"
+ "}\n"
+ ".spcontrolupload button {\n"
+ "	padding: .5em;\n"
+ "	margin: .2em;\n"
+ "}\n"
+ ".spcontrolupload .loadingOverlay {\n"
+ "	position: absolute;\n"
+ "	width: 100%;\n"
+ "	height: 100%;\n"
+ "	display: none;\n"
+ "}\n"
+ ".spcontrolupload .loadingOverlayMsg {\n"
+ "	margin: auto;\n"
+ "	padding: 5em;\n"
+ "	font-size: 1.2em;\n"
+ "}\n"
+ "\n";
//_HAS_SPUPLOAD_CSS_TEMPLATE_


})(jQuery);