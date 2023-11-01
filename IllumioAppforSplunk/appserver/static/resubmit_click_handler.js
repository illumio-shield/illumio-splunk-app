require([
    "jquery",
    "splunkjs/mvc/simplexml/ready!"
], function($) {
    // add a handler to resubmit the dashboard form when a row is clicked in a
    // viz with id=resubmit_on_click_n. workaround to avoid searchWhenChanged
    // but still reload searches when a token-set drilldown is clicked
    $("div[id^='resubmit_on_click_'].dashboard-element").on("click", "tr, path", function(e) {
        $("#submit > button").click();
    });
});
