require(["splunkjs/mvc/utils"], function (SplunkUtil) {
    var app_name = SplunkUtil.getCurrentApp();  
    require.config({
        paths: {
            'jquery_illumio': '../app/' + app_name + '/js/jquery_illumio',
            'underscore_utils': '../app/' + app_name + '/js/underscore-min',
            'jquery-ui': '../app/'+app_name+'/js/jquery-ui.min',
            'jquery-multi': '../app/'+app_name+'/js/jquery.autocomplete.multiselect'
        },
        shim:{
            'jquery-ui': 
            {
                deps: ['jquery_illumio']
            },
            'jquery-multi' : 
            {
                deps: ['jquery-ui']
            }
        }
    });
    require([
        'underscore_utils',
        'splunkjs/mvc',
        'splunkjs/mvc/searchmanager',
        'jquery-multi',
        'css!../app/'+app_name+'/js/jquery-ui.css',
        'splunkjs/mvc/simplexml/ready!',
    ], function(_,mvc,searchManager) {
        var submittedTokenModel = mvc.Components.getInstance('submitted', {create: true});
        var defaultTokenModel = mvc.Components.getInstance('default', {create: true});
        var fqdnToken = mvc.Components.get('fqdn_id');
        var timeRange = mvc.Components.get('time_id');
        $('#audit_event .panel-body').append("<div style='text-align: center;'>Last 24 hours Trend</div>");
        $('#ports_scan .panel-body').append("<div style='text-align: center;'>Last 24 hours Trend</div>");
        $('#firewall_tampering .panel-body').append("<div style='text-align: center;'>Last 24 hours Trend</div>");
        $('#overall_traffic_flows .panel-body').append("<div style='text-align: center;'>Last 24 hours Trend</div>");
        submittedTokenModel.set("blocked_label","");
        submittedTokenModel.set("potentially_blocked_label","");
        submittedTokenModel.set("total_label","");
        submittedTokenModel.set("total_label_overlay","none");
        submittedTokenModel.set("potentially_blocked_label_overlay","none");
        submittedTokenModel.set("blocked_label_overlay","none");
        submittedTokenModel.set("top_workloads_with","");
        submittedTokenModel.set("top_services_with","");
        setSpan();
        var query = '| inputlookup illumio_workload_mapping_lookup | dedup label, type | table label, type';
        var selectedValues = {};

        var multiSelectSearch = new searchManager({
            id: "multiSelectSearch",
            search: query 
        });

        multiSelectSearch.on("search:start", function(properties) 
        {
           $("#total_searchdata").show();
           $("#potentially_searchdata").show();
           $("#blocked_searchdata").show();
           $("#top_workloads_with_searchdata").show();
           $("#top_services_with_searchdata").show();
        });

        multiSelectSearch.on("search:done", function(properties) 
        {
            $("#total_searchdata").hide();
            $("#potentially_searchdata").hide();
            $("#blocked_searchdata").hide();
            $("#top_workloads_with_searchdata").hide();
            $("#top_services_with_searchdata").hide();
        });

        var multiSelectResult = multiSelectSearch.data('results', { // get the data from that search
            count: 0 // get all results
        });

        multiSelectResult.on("data", function() 
        {
            setData(multiSelectResult.data().rows,"total_label_id","total_label");
            setData(multiSelectResult.data().rows,"blocked_label_id","blocked_label");
            setData(multiSelectResult.data().rows,"potentially_blocked_label_id","potentially_blocked_label");
            setData(multiSelectResult.data().rows,"top_workloads_with_id","top_workloads_with");
            setData(multiSelectResult.data().rows,"top_services_with_id","top_services_with");
        });

        function setData(data,multiSelectId,multiSelectToken) 
        { 
            var dataArray = [];
            for (var i = 0; i<data.length; i++) 
            {
                dataArray.push({"label":data[i][1]+":"+data[i][0],"type":data[i][1]});
            }
            $('#'+multiSelectId)
            .autocomplete({
                source: function(request, response) 
                {
                    var results = $.ui.autocomplete.filter(dataArray, request.term);
                    response(results.slice(0, 10));
                },
                minLength : 1,
                multiselect: true
            });

            $('#'+multiSelectId).click(function(e){e.preventDefault();});

            $('#'+multiSelectId).parent().bind("DOMNodeInserted",function(objEvent)
            { 
                setMultiTokenQuery(multiSelectToken,multiSelectId,""); 
                filterMultiSelectValues(dataArray,multiSelectId);
            });

            $('#'+multiSelectId).parent().bind("DOMNodeRemoved",function(objEvent)
            { 
                var node = objEvent.target; 
                setMultiTokenQuery(multiSelectToken,multiSelectId,node); 
                filterMultiSelectValues(dataArray,multiSelectId);
            });
        }
        function filterMultiSelectValues(dataArray,multiSelectId)
        {
            var filtered = dataArray.filter(function(e)
            { 
                if(selectedValues[e.type])
                {
                    for(var index=0; index<selectedValues[e.type].length; index++)
                    {
                        if(e.label == selectedValues[e.type][index].label)
                        {
                            return null; 
                        }                     
                    }
                }
                    return e;
            });
            $('#'+multiSelectId).autocomplete(
            {
                source: function(request, response) 
                {
                    var results = $.ui.autocomplete.filter(filtered, request.term);
                    response(results.slice(0, 10));
                },
                minLength: 1 ,
                multiselect: true
            });  
        }
        function setSelectedValues(labelType,label,selectedValues)
        {
            if(labelType in selectedValues)
            {
                selectedValues[labelType].push({"label" : label});         
            }
            else
            {
                selectedValues[labelType] = new Array();
                selectedValues[labelType].push({"label" : label});
            } 
        }
        var setMultiTokenQuery = function(multiSelectToken,multiSelectId,node)
        {
            selectedValues = {};
            $.each($('#'+multiSelectId).parent().find('.ui-autocomplete-multiselect-item'),function(index, row)
            {
            	if(node!=row)
                setSelectedValues(row.id,row.textContent,selectedValues);  
            });
            var overlayTokenName = multiSelectToken + "_overlay";
            var overlayTokenValue = "";
            var multiselectTokenValue = "";     
            var flag = 0;
            var selectedTokenValue = "";
            var tokenValue = "";
            for(let selectedType in selectedValues)
            {
                var label = [];
                var showLabel = [];
                var overlayValue = "";
                var span = submittedTokenModel.get("span");

                for(var i=0; i<selectedValues[selectedType].length; i++)
                {
                    var escaped_label = (selectedValues[selectedType][i].label).replace(/\"/g, "\\\"");
                    var labelName = (escaped_label).split(":")[1];
                    label.push(escaped_label);
                    showLabel.push(labelName);
                }
                tokenValue = label.join('" OR Illumio.type_label="');
                overlayValue = showLabel.join(":");
                if(flag == 0)
                {
                    selectedTokenValue += ' (Illumio.type_label="' + tokenValue + '")';
                    overlayTokenValue += overlayValue;
                }
                else
                {
                    selectedTokenValue += ' AND ( Illumio.type_label="'+ tokenValue + '")';
                    overlayTokenValue = overlayTokenValue+":"+overlayValue;
                }

                if(flag == 0)
                {
                    flag = flag + 1;
                }

            }
            var action = "";
            var collector_fqdn = submittedTokenModel.get("collector_fqdn");
            if(selectedTokenValue != "")
            {
                if (multiSelectToken == "blocked_label") 
                {
                    action = "blocked";
                } 
                else if (multiSelectToken == "potentially_blocked_label")
                {
                    action = "potentially-blocked";
                } 
                else 
                { 
                    action = "*";
                }
                if(multiSelectToken == "top_workloads_with" || multiSelectToken == "top_services_with")
                {
                    multiselectTokenValue = selectedTokenValue;
                }
                else
                {
                    multiselectTokenValue = ' | appendcols [ |tstats `summariesonly` sum(Illumio.count) as "'+overlayTokenValue+'" from datamodel=Illumio where nodename=Illumio.Illumio_PCE_Collector '+ collector_fqdn +' Illumio.action='+ action +' AND (' + selectedTokenValue + ') by _time | timechart span='+span+' sum("'+overlayTokenValue+'") as "'+overlayTokenValue+'" count | eval "' + overlayTokenValue + '"=if(count==0,0,\''+overlayTokenValue+'\') | table  _time,"' + overlayTokenValue + '" ]';
                }
            }
            else
            {
                overlayTokenValue = "none";
            }
			if(multiSelectToken == "blocked_label" || multiSelectToken == "potentially_blocked_label" || multiSelectToken == "total_label")
            {
                overlayTokenValue = '"'+overlayTokenValue+'"';
                submittedTokenModel.set(overlayTokenName,overlayTokenValue);
                defaultTokenModel.set(overlayTokenName,overlayTokenValue);
            }
            submittedTokenModel.set(multiSelectToken,multiselectTokenValue);
        };
        function makeFqdn(model, selectedFqdn) 
        {
            if (typeof (selectedFqdn) === 'string') selectedFqdn = [selectedFqdn];

            if (!selectedFqdn) return;
            var valuePrefix = fqdnToken.settings.get('valuePrefix') || '';
            var valueSuffix = fqdnToken.settings.get('valueSuffix') || '';
            var prefix = fqdnToken.settings.get('prefix') || '';
            var suffix = fqdnToken.settings.get('suffix') || '';
            var delimiter = fqdnToken.settings.get('delimiter') || '';
            var collectorValuePrefix = "Illumio." + valuePrefix;
            selectedFqdn = _(selectedFqdn).filter(function (item) {
                return (item && item != '')
            });
            var newValue = _(selectedFqdn).map(function (item) {
                return valuePrefix + item + valueSuffix
            });
            var newValue_collector = _(selectedFqdn).map(function (item) {
                return collectorValuePrefix + item + valueSuffix
            });
            var fqdn = prefix + newValue.join(delimiter) + suffix;
            var fqdn_collector = prefix + newValue_collector.join(delimiter) + suffix;
            submittedTokenModel.set('fqdn', fqdn);
            submittedTokenModel.set('collector_fqdn', fqdn_collector);
            defaultTokenModel.set('fqdn', fqdn);
            defaultTokenModel.set('collector_fqdn', fqdn_collector);
			setMultiTokenQuery("blocked_label","blocked_label_id",""); 
            setMultiTokenQuery("total_label","total_label_id",""); 
            setMultiTokenQuery("potentially_blocked_label","potentially_blocked_label_id",""); 
        }
		function setSpan(){
            var span;
            var time = timeRange.val().earliest_time;
            if(timeRange.val().latest_time == "now"){
                switch(time)
                {
                    case "-60m@m":
                        span = "10m";
                        break;
                    case "-3h@m":
                        span = "30m";
                        break;
                    case "-6h@m":
                        span = "1h";
                        break;
                    case "-12h@m":
                        span = "1h";
                        break;
                    case "-24h@h":
                        span = "1h";
                        break;
                    case "-72h@h":
                        span = "6h";  
                        break;
                    case "-7d@h":
                        span = "1d";
                        break;
                    default:
                        span = "30m";                   
                }
            }
            else
            {
                span = "30m";
            }
            submittedTokenModel.set("span",span);
        }
        timeRange.on("change",function(){
            setSpan();
			setMultiTokenQuery("blocked_label","blocked_label_id",""); 
            setMultiTokenQuery("total_label","total_label_id",""); 
            setMultiTokenQuery("potentially_blocked_label","potentially_blocked_label_id","");
        });
        submittedTokenModel.on('change:form.fqdn_form', makeFqdn);
        makeFqdn(submittedTokenModel,submittedTokenModel.get('form.fqdn_form'));
    });
});