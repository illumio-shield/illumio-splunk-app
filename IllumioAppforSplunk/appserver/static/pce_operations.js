require.config({
    paths: {
        jquery_illumio: '../app/IllumioAppforSplunk/js/jquery_illumio'
    }
});
require([
    'jquery_illumio',
    'splunkjs/mvc',
    'splunkjs/mvc/singleview',
    'splunkjs/mvc/postprocessmanager',
    'splunkjs/mvc/simplexml/ready!'
], function($, mvc, SingleView, PostProcessManager) {
    var search_investigation = mvc.Components.get("cluster_details");
    var search_pce_status = mvc.Components.get("pce_service_details");
    var search_policy_database_summary = mvc.Components.get("policy_database_details");
    var submittedTokens = mvc.Components.get('submitted');
    var defaultTokens = mvc.Components.getInstance('default', {create: true});

    //Create the Cluster Details panel
    if(search_investigation){
        search_investigation.on('search:done', function(properties)
        {
            if(properties.content.resultCount == 0){
                deleteTableRows();
            }
        });
        var search_result = search_investigation.data("results");
        search_result.on("data",function(){
            deleteTableRows();
            if(search_result.hasData()){
                submittedTokens.set("pce_details","done");
                defaultTokens.set("pce_details","done");
                var numRows = (search_result.data().rows).length;
                var id = document.getElementById('pce');
                for(var index=0; index<numRows; index++){
                    var row = document.createElement("tr");
                    var heading = document.createElement("td");
                    heading.innerHTML = search_result.data().rows[index][0];
                    var disk_location = search_result.data().rows[index][1];
                    var isMultiDisk = true;
                    if(typeof(disk_location)=="string")
                        isMultiDisk = false;
                    heading.setAttribute("class","table-heading");
                    heading.setAttribute("colspan","6");
                    row.appendChild(heading);
                    id.appendChild(row);
                    var tr = document.createElement('tr');
                    tr.setAttribute("id","node"+index);
                    tr.setAttribute("class","table-row")
                    id.appendChild(tr);
                    for(var j=0; j<6; j++){
                        var td = document.createElement('td');
                        td.setAttribute("id","node"+index+"-element"+j);
                        td.setAttribute("class","table-data")
                        document.getElementById('node'+index).appendChild(td);
                    }
                }
                for(var i=0; i<numRows; i++){
                    createTitle("node"+i+"-element0","Status");
                    createTitle("node"+i+"-element1","CPU Utilization");
                    createTitle("node"+i+"-element2","Memory Utilization");
                    createTitle("node"+i+"-element3","Disk Utilization", isMultiDisk);
                    createTitle("node"+i+"-element4","Policy Disk Latency");
                    createTitle("node"+i+"-element5","Traffic Disk Latency");

                    createQuery(i,"0","status", search_result.data().rows[i][0]);
                    createQuery(i,"1","cpu", search_result.data().rows[i][0]);
                    createQuery(i,"2","memory", search_result.data().rows[i][0]);

                    if(isMultiDisk)
                        createDiskTable("node"+i+"-element3", "node"+i+"-search3", search_result.data().rows[i][0]);
                    else
                        createQuery(i,"3","disk", search_result.data().rows[i][0]);

                    createQuery(i,"4","policy_disk_latency", search_result.data().rows[i][0]);
                    createQuery(i,"5","traffic_disk_latency", search_result.data().rows[i][0]);
                }
            }
        });
    }


    //function to create Disk Table
    function createDiskTable(elementID, managerID, hostname){

        var query = '| search hostname="'+hostname+'" | stats latest(disk{}.value.percent) as disk, latest(disk{}.value.status) as status by disk{}.location | rename disk{}.location as location';
        var baseSearchId = "base_cluster_details";
        var disk_info = new PostProcessManager({
            id: managerID,
            managerid: baseSearchId,
            search: query,
            "preview":true
        });

        var div = document.createElement("div");
        var table = document.createElement("table");
        $(div).attr("class", "disk_usage custom_table");
        $(table).attr("cellpadding", "5");
        div.appendChild(table);
        document.getElementById(elementID).appendChild(div);
        var search_result = disk_info.data("results");
        search_result.on("data", function(e){
            if(search_result.hasData()){
                $(table).empty();

                var numRows = (search_result.data().rows).length;
                for(var i=0;i<numRows;i++){
                    var disk_data = search_result.data().rows[i];
                    var location = disk_data[0];
                    var percent = disk_data[1];
                    var status = disk_data[2];
                    $(table).append("<tr><td>"+location+": <span class='"+status+"'>"+percent+"%</span></td></tr>");
                }
            }
        });
    }

    //Create PCE Service Status Panel
    if(search_pce_status){
        search_pce_status.on('search:done', function(properties)
        {
            if(properties.content.resultCount == 0){
                var id = document.getElementById('pce_service_status');
                var fc = id.firstChild;

                while( fc ) {
                    id.removeChild( fc );
                    fc = id.firstChild;
                }
                var col = document.createElement("div");
                col.setAttribute("id","id1");
                col.setAttribute("class","div-pce-service");
                var heading = document.createElement("div");
                heading.innerHTML = '<p class="pce_service_font" style="color:grey">No results found.</p>';
                col.appendChild(heading);
                id.appendChild(col)
            }
        });

        var search_pce_result = search_pce_status.data("results");
        search_pce_result.on("data",function(){
            if(search_pce_result.hasData()){
                var numRows = (search_pce_result.data().rows).length;
                var id = document.getElementById('pce_service_status');
                var fc = id.firstChild;

                while( fc ) {
                    id.removeChild( fc );
                    fc = id.firstChild;
                }

                for(var index=0; index<numRows; index++){
                    create_service_div(id,"Not Running",search_pce_result.data().rows[index][0],"rgb(217, 63, 60);");
                    create_service_div(id,"Optional",search_pce_result.data().rows[index][2],"grey");
                    create_service_div(id,"Partial",search_pce_result.data().rows[index][1],"rgb(247, 188, 56);");
                    create_service_div(id,"Running",search_pce_result.data().rows[index][3],"rgb(101, 166, 55);");
                    create_service_div(id,"Unknown",search_pce_result.data().rows[index][4],"grey");
                }
            }
        });
    }

    //Create Policy Database Summary Panel
    if(search_policy_database_summary){
        search_policy_database_summary.on('search:done', function(properties)
        {
            if(properties.content.resultCount == 0){
                var id = document.getElementById('policy_database_summary');
                var fc = id.firstChild;

                while( fc ) {
                    id.removeChild( fc );
                    fc = id.firstChild;
                }
                var col = document.createElement("div");
                col.setAttribute("id","id1");
                col.setAttribute("class","div-pce-service");
                var heading = document.createElement("div");
                heading.innerHTML = '<p class="pce_service_font" style="color:grey">No results found.</p>';
                col.appendChild(heading);
                id.appendChild(col)
            }
        });

        var search_policy_database_result = search_policy_database_summary.data("results");
        search_policy_database_result.on("data",function(){
            if(search_policy_database_result.hasData()){
                var numRows = (search_policy_database_result.data().rows).length;
                var id = document.getElementById('policy_database_summary');
                var fc = id.firstChild;

                while( fc ) {
                    id.removeChild( fc );
                    fc = id.firstChild;
                }

                for(var index=0; index<numRows; index++){
                    create_service_div(id,"Database size",search_policy_database_result.data().rows[index][0],"grey");
                    create_service_div(id,"Database Disk Utilization",search_policy_database_result.data().rows[index][1],"grey");
                    create_service_div(id,"Transaction ID Max Age",search_policy_database_result.data().rows[index][2],"grey");
                    create_service_div(id,"Vacuum Backlog",search_policy_database_result.data().rows[index][3],"grey");

                }
            }
        });
    }

    //function to create dynamic elements in panels
    function create_service_div(parent,label,value,color){
        var col = document.createElement("div");
        col.setAttribute("class","div-pce-service");
        var heading = document.createElement("div");
        heading.innerHTML = '<p class="pce_service_font" style="color:'+color+'">'+label+': '+value+'</p>';
        col.appendChild(heading);
        parent.appendChild(col);
    }

    //function to delete Table rows
    function deleteTableRows(){
        var table = document.getElementById('pce');
        var length = table.rows.length;
        for(var i=0; i<length; i++){
            deleteView("node"+i+"-element0");
            deleteView("node"+i+"-element1");
            deleteView("node"+i+"-element2");
            deleteView("node"+i+"-element3");
            deleteView("node"+i+"-element4");
            deleteView("node"+i+"-element5");
            deleteView("node"+i+"-search0");
            deleteView("node"+i+"-search1");
            deleteView("node"+i+"-search2");
            deleteView("node"+i+"-search3");
            deleteView("node"+i+"-search4");
            deleteView("node"+i+"-search5");
            submittedTokens.unset("pce_details","");
            defaultTokens.unset("pce_details","")
        }
        while(table.rows.length >=1) {
            table.deleteRow(0);
        }
    }

    //function to delete Views
    function deleteView(id){
        var view = mvc.Components.getInstance(id);
        if(view){
            view.dispose();
        }
    }

    //function to create Title in Panels
    function createTitle(elementID, title, applyCSS){
        var div = document.createElement("div");
        div.setAttribute("class","table-data-heading");
        div.innerHTML = title;
        if(applyCSS && title=="Disk Utilization"){
            div.style.marginLeft = "120px";
        }
        document.getElementById(elementID).appendChild(div);
    }

    //function to create Query in splunk on the basis of field provided
    function createQuery(nodeId, elementID, field, hostname){
        var query = "";
        var baseSearchId="";
        if(field == "status"){
            query = '| search hostname="'+hostname+'" | table services.status | rename services.status as Status | eval Status = upper(substr(Status,0,1)) + lower(substr(Status,2)) | table Status | eval severity=case(Status ="Normal", 0, Status ="Warning", 5, Status = "Critical", 10) | rangemap field=severity low=0-4 elevated=4-6 default=severe';
            baseSearchId="base_one_cluster_details";
        }
        else if(field == "disk"){
            query = '| search hostname="'+hostname+'" | chart latest(disk{}.value.percent) as disk,latest(disk{}.value.status) as status by _time | eval status = upper(substr(status,0,1)) + lower(substr(status,2)) | eval severity=case(status="Normal", 0, status="Warning", 5, status="Critical", 8) | rangemap field=severity low=0-4 elevated=4-6 default=severe';
            baseSearchId="base_cluster_details";
        }
        else if(field == "policy_disk_latency"){
            query = '| search "metrics{}.entries{}.values{}.value"=* hostname="'+hostname+'" | eval policy_disk_latency=mvindex(\'metrics{}.entries{}.values{}.value\', 0), policy_disk_status=mvindex(\'metrics{}.entries{}.values{}.status\', 0) | fillnull value="N/A" policy_disk_latency | chart latest(policy_disk_latency) as disk, latest(policy_disk_status) as status by _time | eval status = upper(substr(status,0,1)) + lower(substr(status,2)) | eval severity=case(status="Normal", 0, status="Warning", 5, status="Critical", 8) | rangemap field=severity low=0-4 elevated=4-6 default=severe';
            baseSearchId="base_cluster_details";
        }
        else if(field == "traffic_disk_latency"){
            query = '| search "metrics{}.entries{}.values{}.value"=* hostname="'+hostname+'" | eval traffic_disk_latency=mvindex(\'metrics{}.entries{}.values{}.value\', 2), traffic_disk_status=mvindex(\'metrics{}.entries{}.values{}.status\', 1) | fillnull value="N/A" traffic_disk_latency | chart latest(traffic_disk_latency) as disk, latest(traffic_disk_status) as status by _time | eval status = upper(substr(status,0,1)) + lower(substr(status,2)) | eval severity=case(status="Normal", 0, status="Warning", 5, status="Critical", 8) | rangemap field=severity low=0-4 elevated=4-6 default=severe';
            baseSearchId="base_cluster_details";
        }
        else{
            query = '| search hostname="'+hostname+'" | chart latest('+field+'.percent) as '+field+',latest('+field+'.status) as status by _time | eval status = upper(substr(status,0,1)) + lower(substr(status,2)) | eval severity=case(status="Normal", 0, status="Warning", 5, status="Critical", 8) | rangemap field=severity low=0-4 elevated=4-6 default=severe';
            baseSearchId="base_cluster_details";
        }
        var managerID = "node"+nodeId+"-search"+elementID;
        elementID = "node"+nodeId+"-element"+elementID;
        createView(elementID, managerID, field, query, baseSearchId);
    }

    function createView(elementID, managerId, field, query, baseSearchId){

        var pceHealth = new PostProcessManager({
            "id": managerId,
            "managerid": baseSearchId,
            "search": query,
            "preview":true
        });

        var nodeSingleView = new SingleView({
            id: elementID,
            managerid: managerId,
            el: $("#"+elementID)
        }).render();

        nodeSingleView.settings.set({
            "drilldown": "none"
        });

        if(field == "cpu" || field == "memory" || field == "disk"){
            nodeSingleView.settings.set({
                "unit": "%",
                "trendColorInterpretation": "inverse",
                "trendDisplayMode": "percent",
            });
        }
        else if (field == "policy_disk_latency" || field == "traffic_disk_latency"){
            nodeSingleView.settings.set({
                "unit": "ms",
                "trendColorInterpretation": "inverse",
                "trendDisplayMode": "percent"
            });
        }
    }
});