/**
 * Created by Daniel Maatary on 4/22/15.
 */

function getsuggestion($, searchString) {

    $.ajax({
            url: "http://thesaurus.iadb.org/extractor/api/suggest",

            data: {projectId: "1DCE031A-B429-0001-49B6-15A028B01F5D", language: "en", searchString: searchString},

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

                $("body").append("<p>" + textStatus + "<p>")
            },

            success:  function( data, textStatus, jqXHR ) {

                var formatteddata = { label: data.suggestedConcepts[0].matchingLabel, value: data.suggestedConcepts[0]}

                $("body").append("<p>" + JSON.stringify(data) + "<p>")

            }
        }
    )

}


function set_authors_autocomplete ($) {

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
    })
}







$(document).ready(function(){
    //getsuggestion($, "for");

    //$("#search_authors").val("type authors here")

    set_authors_autocomplete($)
});