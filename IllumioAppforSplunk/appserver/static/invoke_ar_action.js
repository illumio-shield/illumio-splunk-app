require.config({
    paths: {
        underscore_utils: '../app/IllumioAppforSplunk/js/underscore-min'
    }
});
require([
    'underscore_utils',
    'splunkjs/mvc',
    'splunkjs/mvc/tableview',
    'splunkjs/mvc/searchmanager',
    'splunkjs/mvc/simplexml/ready!'
], function(_, mvc, TableView, SearchManager) {

    var tableCampaign = mvc.Components.get("quarantineHost");
    var quarantineSearch = mvc.Components.get("quarantineSearch");
    $("body").append("<div id='screen_loader' class='screen_loader'></div>");
    $("#screen_loader").hide();
    var customRangeRenderer = TableView.BaseCellRenderer.extend({
        canRender: function (cell) {
            return _(['Quarantine']).contains(cell.field);
        },
        render: function ($td, cell) {
            // creating cell with quarantine button.
            if(cell.field == "Quarantine"){
                var data = cell.value;
                var values = data.split(",");
                var workload_uuid = values[0] || "";
                var fqdn = values[1] || "";
                var showQuarantine = values[2] || 0;
 
                if (showQuarantine == 1)
                {
                    var selection = $td.html("<div class='ar_containter'><div class='ar_button' value='Quarantine'>Quarantine</div><div>");
                    selection.on('click', function (event) 
                    {
                        var target = event.target.getAttribute('value');
                        if(target != "Quarantine")
                        {
                            return;
                        }
                        $("#screen_loader").show();
                        var milliseconds = (new Date).getTime();
                        // invoke Mark Workload Quarantine AR action
                        var query = '| makeresults 1 | eval workload_uuid="' + workload_uuid + '" | eval fqdn = "' + fqdn + '" | table workload_uuid fqdn | sendalert markquarantine';
                        var markQuarantine = new SearchManager({
                            "id": milliseconds,
                        "search": query
                    });
                    var markQuarantineResults = markQuarantine.data("results");
                    markQuarantineResults.on("data",function()
                    {
                        var earliest = parseInt(milliseconds/1000) - 300;
                        var check = 0;
                        var resultQuery = '(index="_internal" OR index="cim_modactions") source="*markquarantine_modalert.log" action_name="markquarantine" search_name="' + milliseconds + '" action_status="*" | head 1 | table action_status signature';
                        // the below search manager reads the results of quarantine workload AR action
                        var getActionResults = new SearchManager({
                            "earliest_time":earliest,
                            "latest_time":"now",
                            "search": resultQuery
                        });
                        getActionResults.on("search:done",function(properties){
                            if(properties.content.resultCount == 0 && check < 100) {
                                //invoke the search again to fetch the results of AR action
                                getActionResults.startSearch();
                                check = check + 1;
                            } 
                            else if(check >= 100) {
                                $("#screen_loader").hide();
                                alert("Failed to fetch Quarantine Workload status");
                            }
                        }); 
                        var result = getActionResults.data("results");
                        result.on("data", function(){
                            $("#screen_loader").hide();
                            var actionStatus = result.data().rows[0][0] || "failure";
                            var message = result.data().rows[0][1] || "Quarantine Workload was unsuccessfull";
                            alert(message);
                            if(actionStatus == "success"){
                                quarantineSearch.startSearch();
                            }
                            });     
                        });
                    });
                }
                else
                {
                    $td.html("<div class='ar_containter'><div class='ar_disable_button' value='Quarantine'>Quarantine</div><div>");
                }
            }
        }
    }),
    customRangeRenderer2 = TableView.BaseCellRenderer.extend({
        canRender: function (cell) {
            return _(['Investigate']).contains(cell.field);
        },
        render: function ($td, cell) {
            // creating cell with Investigate button.
            if(cell.field == "Investigate"){
                var data = cell.value;
                var values = data.split(",");
                var host_ip = values[0] || "";
                $td.html("<div class='ar_containter'><div class='investigate_button' value='Investigate'>Investigate</div><div>");
                $td.on('click', function (event) 
                {
                    var URL = "workload_investigation?form.host_ip=" + host_ip;
                    window.open(URL)
                });
            }
        }
    });
    if (tableCampaign !== undefined) {
        tableCampaign.getVisualization(function (tableView) {
        // Add custom cell renderer and force re-render.
            tableView.table.addCellRenderer(new customRangeRenderer());
            tableView.table.addCellRenderer(new customRangeRenderer2());
            tableView.table.render();
        });
    }
});