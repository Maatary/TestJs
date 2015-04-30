/**
 * Created by Daniel Maatary on 4/22/15.
 */


function set_autocomplete ($) {

    $("#search_authors").autocomplete({

        source: function (request, response) {

            $.ajax({

                url: "http://thesaurus.iadb.org/extractor/api/suggest",

                data: {projectId: "1DCE031A-B429-0001-49B6-15A028B01F5D", language: "en", searchString: request.term},

                username: 'superadmin',
                password: 'poolparty',

                dataType: 'json',
                crossDomain: true,


                beforeSend: function(req) {
                    req.setRequestHeader('Authorization', 'Basic ' + btoa('superadmin:poolparty'));
                },

                xhrFields: {
                    withCredentials: true
                },

                error: function( jqXHR, textStatus, errorThrown ) {
                    response(textStatus)
                },

                success: function (data) {

                    var datatable = Array();

                    for(i = 0; i < data.suggestedConcepts.length; i++) {
                        datatable[i] = {label: data.suggestedConcepts[i].matchingLabel, value: data.suggestedConcepts[i].prefLabel, mydata: data.suggestedConcepts[i]}
                        datatable[i].label = datatable[i].label.replace("<em>", "<strong class = \"ac_highlight\">")
                        datatable[i].label = datatable[i].label.replace("</em>", "</strong>")
                        //TODO Filter conceptsSchemes table object
                    }

                    response(datatable);
                }
            })
        },

        minLength: 2,

        select: function (event, ui) {
           $( "#search_authors" ).val( ui.item.value)
            alert(JSON.stringify(ui.item.mydata))
        },


        html: true,

        open: function () {
            $(this).removeClass("ui-corner-all").addClass("ui-corner-top");
        },
        close: function () {
            $(this).removeClass("ui-corner-top").addClass("ui-corner-all");
        }
    }).autocomplete("instance")._renderMenu = function( ul, items ) {
        var that = this;
        $.each( items, function( index, item ) {
            that._renderItemData( ul, item );
        });
        $( ul ).find( "li:odd" ).addClass( "ac_odd" );

    }
}

$(document).ready(function(){

    set_autocomplete($)
});