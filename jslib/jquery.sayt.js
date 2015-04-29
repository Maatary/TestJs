/*
 * jQuery SAYT plugin 1.2.2
 *
 * Copyright (c) 2009 Jörn Zaefferer
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 * With modifications by Smartlogic
 *
 */

;(function($) {

var escapeRegExp = function(str){ return str.replace(/([-.*+?^${}()|[\]\/\\])/g, "\\$1"); };
	
$.fn.extend({
	sayt: function(options) {
		options = $.extend({}, $.SAYTAutocompleter.defaults, {}, options);
		
		return this.each(function() {
			new $.SAYTAutocompleter(this, options);
		});
	},
	flushCache: function() {
		return this.trigger("flushCache");
	},
	setOptions: function(options){
		return this.trigger("setOptions", [options]);
	},
	unautocomplete: function() {
		return this.trigger("unautocomplete");
	}
});


$.SAYTAutocompleter = function(input, options) {

	var KEY = {
		UP: 38,
		DOWN: 40,
		DEL: 46,
		TAB: 9,
		RETURN: 13,
		ESC: 27,
		COMMA: 188,
		PAGEUP: 33,
		PAGEDOWN: 34,
		BACKSPACE: 8
	};
	
	var globalFailure = null;
	if(options.failure != null && typeof options.failure == "function") {
	  globalFailure = options.failure;
	}

    var emptyResult = null;
    if(typeof options.emptyResult == "function") {
        emptyResult = options.emptyResult;
    }

    var hasResult = null;
    if(typeof options.hasResult == "function") {
        hasResult = options.hasResult;
    }

	// Create $ object for input element
	var $input = $(input).attr("autocomplete", "off").addClass(options.inputClass);

	var timeout;
	var previousValue = "";
	var cache = $.SAYTAutocompleter.Cache(options);
	var hasFocus = 0;
	var lastKeyPressCode;
	var config = {
		mouseDownOnSelect: false
	};
	
	var select = $.SAYTAutocompleter.Select(options, input, selectCurrent, config);

	var blockSubmit;
	
	// prevent form submit in opera when selecting with return key
	$.browser.opera && $(input.form).bind("submit.autocomplete", function() {
		if (blockSubmit) {
			blockSubmit = false;
			return false;
		}
	});
	
	// only opera doesn't trigger keydown multiple times while pressed, others don't work with keypress at all
	$input.bind(($.browser.opera ? "keypress" : "keydown") + ".autocomplete", function(event) {
		// a keypress means the input has focus
		// avoids issue where input had focus before the autocomplete was applied
		hasFocus = 1;
		// track last key pressed
		lastKeyPressCode = event.keyCode;
		switch(event.keyCode) {
		
			case KEY.UP:
				if ( select.visible() ) {
					event.preventDefault();
					select.prev();
				} else {
					onChange(0, true);
				}
				break;
				
			case KEY.DOWN:
				if ( select.visible() ) {
					event.preventDefault();
					select.next();
				} else {
					onChange(0, true);
				}
				break;
				
			case KEY.PAGEUP:
				if ( select.visible() ) {
  				event.preventDefault();
					select.pageUp();
				} else {
					onChange(0, true);
				}
				break;
				
			case KEY.PAGEDOWN:
				if ( select.visible() ) {
  				event.preventDefault();
					select.pageDown();
				} else {
					onChange(0, true);
				}
				break;
			
			// matches also semicolon
			case KEY.TAB:
			case KEY.RETURN:
				if( selectCurrent() ) {
					// stop default to prevent a form submit, Opera needs special handling
					event.preventDefault();
					blockSubmit = true;
					return false;
				}
				break;
				
			case KEY.ESC:
				select.hide();
				break;
				
			default:
				clearTimeout(timeout);
				timeout = setTimeout(onChange, options.delay);
				break;
		}
	}).focus(function(){
		// track whether the field has focus, we shouldn't process any
		// results if the field no longer has focus
		hasFocus++;
	}).blur(function() {
	  hasFocus = 0;
		if (!config.mouseDownOnSelect) {
			hideResults();
		}
	}).click(function() {
		// show select when clicking in a focused field
		// but if clickFire is true, don't require field
		// to be focused to begin with; just show select
		if( options.clickFire ) {
		  if ( !select.visible() ) {
  			onChange(0, true);
  		}
		} else {
		  if ( hasFocus++ > 1 && !select.visible() ) {
  			onChange(0, true);
  		}
		}
	}).bind("flushCache", function() {
		cache.flush();
	}).bind("setOptions", function() {
		$.extend(true, options, arguments[1]);
	}).bind("unautocomplete", function() {
		select.unbind();
		$input.unbind();
		$(input.form).unbind(".autocomplete");
	});
	
	
	function selectCurrent() {
		var selected = select.selected();
		if( !selected )
			return false;
		
		var v = selected.result;
		previousValue = v;
		
		$input.val(v);
		hideResultsNow();
		if (options.select) options.select(selected.data.term);
		return true;
	}
	
	function onChange(crap, skipPrevCheck) {
		if( lastKeyPressCode == KEY.DEL ) {
			select.hide();
			return;
		}
		
		var currentValue = $input.val();
		
		if ( !skipPrevCheck && currentValue == previousValue )
			return;
		
		previousValue = currentValue;
		
		if ( currentValue.length >= options.minChars) {
			$input.addClass(options.loadingClass);
			currentValue = currentValue.toLowerCase();
			request(currentValue, receiveData, hideResultsNow);
		} else {
			stopLoading();
			select.hide();
		}
	};

    var onChangeFunction = onChange;
	
	function hideResults() {
		clearTimeout(timeout);
		timeout = setTimeout(hideResultsNow, 200);
	};

	function hideResultsNow() {
		var wasVisible = select.visible();
		select.hide();
		clearTimeout(timeout);
		stopLoading();
	};

	function receiveData(q, data) {
		if ( data && data.length && hasFocus ) {
			stopLoading();
			select.display(data, q);
			select.show();
            if (hasResult != null) {
                hasResult();
            }
		} else {
            if (emptyResult != null) {
                emptyResult();
            }
			hideResultsNow();
		}
	};

	var cur_call;
	function request(term, success, failure) {
		term = term.toLowerCase();
		var data = cache.load(term);
		// recieve the cached data
		if (data && data.length) {
			success(term, data);
		// if an AJAX url has been supplied, try loading the data now
		} else if( (typeof options.url == "string") && (options.url.length > 0) ){
			var extraParams={};
			$.each(options.extraParams, function(key, param) {
				extraParams[key] = typeof param == "function" ? param() : param;
			});

			if (cur_call) cur_call.abort(); // Cancel out of order responses
			cur_call = $.ajax({
				dataType: 'jsonp',
				url: options.url + '/hints/' + encodeURIComponent(term) + '.json',
				data: $.extend({
					prefix_results_limit: options.max
				}, extraParams),
				method: 'get',
				success: function(data) {
					if (data.error) {
						if (options.error) options.error(data.error.errorType, data.error.errorMessage);
					} else {
						var parsed = parse(data);
						cache.add(term, parsed);
						success(term, parsed);
					}
				},
				error: function(xhr, ajaxOptions, error) { if (error!='abort' && options.error) options.error(xhr.status, error); }
			});
		} else {
			// if we have a failure, we need to empty the list -- this prevents the the [TAB] key from selecting the last successful match
			select.emptyList();
			if (globalFailure != null) {
				globalFailure();
			} else {
				failure(term);
			}
		}
	};
	
	function parse(data) {
		
		var parsed = [];
		if (data.error) return;
		for (var hintIndex in data.termHints) {
			var hint = data.termHints[hintIndex];
			parsed[parsed.length] = {
				data: {
					id: hint.id,
					name: hint.name,
					term: hint
				},
				value: hint.id
			};
		}
		return parsed;
	};

	function stopLoading() {
		$input.removeClass(options.loadingClass);
	};

};

$.SAYTAutocompleter.defaults = {
	inputClass: "ac_input",
	resultsClass: "ac_results",
	loadingClass: "ac_loading",
	minChars: 1,
	delay: 100,
	cacheLength: 10,
	max: 10,
	showAll: false,
	extraParams: {},
	selectFirst: false,
	inputFocus: true,
	clickFire: false,
    scroll: true,
    scrollJumpPosition: true
};

$.SAYTAutocompleter.Cache = function(options) {

	var data = {};
	var length = 0;
	
	function add(q, value) {
		if (length > options.cacheLength){
			flush();
		}
		if (!data[q]){ 
			length++;
		}
		data[q] = value;
	}
	
	
	function flush(){
		data = {};
		length = 0;
	}
	
	return {
		flush: flush,
		add: add,
		load: function(q) {
			if (!options.cacheLength || !length)
				return null;

			// if the exact item exists, use it
			if (data[q]){
				return data[q];
			}
			return null;
		}
	};
};

$.SAYTAutocompleter.Select = function (options, input, select, config) {
	var CLASSES = {
		ACTIVE: "ac_over"
	};
	
	var listItems,
		active = -1,
		data,
		term = "",
		needsInit = true,
		element,
		list;
	
	// Create results
	function init() {
		if (!needsInit)
			return;
		element = $("<div/>")
		.hide()
		.addClass(options.resultsClass)
		.css("position", "absolute")
		.appendTo(document.body)
		.hover(function(event) {
		  // Browsers except FF do not fire mouseup event on scrollbars, resulting in mouseDownOnSelect remaining true, and results list not always hiding.
		  if($(this).is(":visible")) {
		    input.focus();
		  }
		  config.mouseDownOnSelect = false;
		});
	
		list = $("<ul/>").appendTo(element).mouseover( function(event) {
			if(target(event).nodeName && target(event).nodeName.toUpperCase() == 'LI') {
	            active = $("li", list).removeClass(CLASSES.ACTIVE).index(target(event));
			    $(target(event)).addClass(CLASSES.ACTIVE);            
	        }
		}).click(function(event) {
			$(target(event)).addClass(CLASSES.ACTIVE);
			select();
			if( options.inputFocus )
			  input.focus();
			return false;
		}).mousedown(function() {
			config.mouseDownOnSelect = true;
		}).mouseup(function() {
			config.mouseDownOnSelect = false;
		});
		
		if( options.width > 0 )
			element.css("width", options.width);
			
		needsInit = false;
	} 
	
	function target(event) {
		var element = event.target;
		while(element && element.tagName != "LI")
			element = element.parentNode;
		// more fun with IE, sometimes event.target is empty, just ignore it then
		if(!element)
			return [];
		return element;
	}

	function moveSelect(step) {
		listItems.slice(active, active + 1).removeClass(CLASSES.ACTIVE);
		movePosition(step);
        var activeItem = listItems.slice(active, active + 1).addClass(CLASSES.ACTIVE);
        if(options.scroll) {
            var offset = 0;
            listItems.slice(0, active).each(function() {
				offset += this.offsetHeight;
			});
            if((offset + activeItem[0].offsetHeight - list.scrollTop()) > list[0].clientHeight) {
                list.scrollTop(offset + activeItem[0].offsetHeight - list.innerHeight());
            } else if(offset < list.scrollTop()) {
                list.scrollTop(offset);
            }
        }
	};
	
	function movePosition(step) {
		if (options.scrollJumpPosition || (!options.scrollJumpPosition && !((step < 0 && active == 0) || (step > 0 && active == listItems.size() - 1)) )) {
			active += step;
			if (active < 0) {
				active = listItems.size() - 1;
			} else if (active >= listItems.size()) {
				active = 0;
			}
		} 
	}

	
	function limitNumberOfItems(available) {
		return options.max && options.max < available
			? options.max
			: available;
	}
	
	function fillList() {
		list.empty();
		var max = limitNumberOfItems(data.length);
		for (var i=0; i < max; i++) {
			if (!data[i])
				continue;
            if (typeof data[i].data.term.values === "undefined")
                continue;
			var formatted = formatItem(data[i].data.term, i+1, max, data[i].value, term);
			if ( formatted === false )
				continue;
			var li = $("<li/>").html( highlight(formatted, term) ).addClass(i%2 == 0 ? "ac_even" : "ac_odd").appendTo(list)[0];
			$.data(li, "ac_data", data[i]);
		}
		listItems = list.find("li");
		if ( options.selectFirst ) {
			listItems.slice(0, 1).addClass(CLASSES.ACTIVE);
			active = 0;
		}
		// apply bgiframe if available
		if ( $.fn.bgiframe )
			list.bgiframe();
	}
	
	function highlight(value, term) {
		var regex = new RegExp('(<[^>]*>)|(\\b'+ escapeRegExp(term) +')', 'ig');
		return value.replace(regex, function(a, b, c){
			return (a.charAt(0) == '<') ? a : '<strong class="ac_highlight">' + c + '</strong>'; 
		});
	}

	function formatItem (termDetails, index, max, termId, query) {
		var out = '<span class="ac_highlightable">' + termDetails.name;
		
		// If the Preferred Term didn't contain the search term then add the hint list

		if (termDetails.values.length && termDetails.values[0].nature=='NPT') {
			out += " (";
			for (i in termDetails.values) {
			   out += "<i> " + termDetails.values[i].value + " </i>";
			   if (!options.showAll) break;
			   if (++i != termDetails.values.length ) out += ", ";
			}
			out += ")";
		}
		out += '</span>';
		
		// if we have facet names add them as byline
		if (termDetails.facets.length) {
		   out += "<br><span class=\"facet\"><i>in ";

		   for (var i = 0;i < termDetails.facets.length;)
           {
			   out += "<strong>" + termDetails.facets[i].name + "</strong>";
               i++;
			   if ( (i+2) == termDetails.facets.length) out += " and ";
			   else if ( i!=termDetails.facets.length) out += ", ";
		   }
		   out += "</i></span>";
		}
		return out;
	}

	return {
		display: function(d, q) {
			init();
			data = d;
			term = q;
			fillList();
		},
		next: function() {
			moveSelect(1);
		},
		prev: function() {
			moveSelect(-1);
		},
		pageUp: function() {
			if (active != 0 && active - 8 < 0) {
				moveSelect( -active );
			} else {
				moveSelect(-8);
			}
		},
		pageDown: function() {
			if (active != listItems.size() - 1 && active + 8 > listItems.size()) {
				moveSelect( listItems.size() - 1 - active );
			} else {
				moveSelect(8);
			}
		},
		hide: function() {
			element && element.hide();
			listItems && listItems.removeClass(CLASSES.ACTIVE);
			active = -1;
		},
		visible : function() {
			return element && element.is(":visible");
		},
		current: function() {
			return this.visible() && (listItems.filter("." + CLASSES.ACTIVE)[0] || options.selectFirst && listItems[0]);
		},
		show: function() {
			var offset = $(input).offset();
			element.css({
				width: (options.width) ? options.width : 
					$(input).width() + parseInt($(input).css("padding-left")) + parseInt($(input).css("padding-right")),
				top: offset.top + input.offsetHeight,
				left: offset.left
			}).show();
            if(options.scroll) {
                list.scrollTop(0);
				if (options.scrollHeight) {
					list.css({
						maxHeight: options.scrollHeight,
						overflow: 'auto'
					});
				}
				
                if($.browser.msie && typeof document.body.style.maxHeight === "undefined") {
					var listHeight = 0;
					listItems.each(function() {
						listHeight += this.offsetHeight;
					});
					var scrollbarsVisible = listHeight > options.scrollHeight;
                    list.css('height', scrollbarsVisible ? options.scrollHeight : listHeight );
					if (!scrollbarsVisible) {
						// IE doesn't recalculate width when scrollbar disappears
						listItems.width( list.width() - parseInt(listItems.css("padding-left")) - parseInt(listItems.css("padding-right")) );
					}
                }
                
            }
		},
		selected: function() {
			var selected = listItems && listItems.filter("." + CLASSES.ACTIVE).removeClass(CLASSES.ACTIVE);
			return selected && selected.length && $.data(selected[0], "ac_data");
		},
		emptyList: function (){
			list && list.empty();
		},
		unbind: function() {
			element && element.remove();
		}
	};
};

})(jQuery);