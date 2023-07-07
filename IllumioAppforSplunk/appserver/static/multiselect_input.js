require.config({
    paths: {
        underscore_utils: '../app/IllumioAppforSplunk/js/underscore-min'
    }
});
require([
    'underscore_utils',
    'splunkjs/mvc',
    'splunkjs/mvc/simplexml/ready!'
    ],
    function(_,mvc){

        function setupMultiInput(instance_id) {

            var multiselect = mvc.Components.get(instance_id);

            if (multiselect){
                multiselect.on("change", function(){
                    let current_val = multiselect.val();
                    let first_choice_value = multiselect.options.choices[0].value;
                    if (current_val.length > 1 && current_val.indexOf(first_choice_value) == 0) {
                        multiselect.val(_.without(current_val, first_choice_value));
                    }
                    if (current_val.length > 1 && current_val.includes(first_choice_value) && current_val.indexOf(first_choice_value) != 0) {
                        multiselect.val([first_choice_value]);
                    }
                });
            }
        };

        var all_multi_selects = document.getElementsByClassName("input-multiselect");
        for (j = 0; j < all_multi_selects.length; j++) {
            setupMultiInput(all_multi_selects[j].id);
        }
    }
)