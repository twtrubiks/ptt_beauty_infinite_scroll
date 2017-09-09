function format_data(data) {
    var result = '';
    for (var i = 0; i < data.length; i++) {
        result += '<div class="col-lg-3 col-md-4 col-xs-6 thumb">\n' +
            +data[i].id +
            '             <div class="images">\n' +
            '                 <a class="img-thumbnail" href="' + data[i].Url + '" target="_blank">\n' +
            '                     <img alt="' + data[i].Url + '" data-original="' + data[i].Url + '" width="250" height="350">\n' +
            '                 </a>\n' +
            '                 <a class="del_photo" href="javascript:remove_button(' + data[i].id + ')">\n' +
            '                     <i class="fa fa-times-circle-o fa-2x"></i>\n' +
            '                 </a>\n' +
            '             </div>\n' +
            '       </div>';
    }
    return result;
}

var page = 1;
$('div#loadmoreajaxloader').hide();
new LazyLoad();


$.ajax({
    url: '/api/image/randoms/',
    type: 'GET',
    data: {'page': page},
    success: function (data) {
        console.log('success');
        page += 1;
        console.log(page);
        var result = format_data(data);
        $('.row').append(result);
        new LazyLoad();
        $('div#loadmoreajaxloader').hide();
        $(window).data('ajaxready', true);
    }
});


function remove_button(id) {
    swal({
            title: "你確定要刪除嗎?",
            text: "你將要刪除這張圖片",
            type: "warning",
            showCancelButton: true,
            confirmButtonClass: "btn-danger",
            confirmButtonText: "Yes, delete it!",
            closeOnConfirm: false,
            showLoaderOnConfirm: true
        },
        function () {
            $.ajax({
                url: '/api/image/' + id + '/',
                method: 'DELETE'
            }).success(function (data, textStatus, jqXHR) {
                location.reload();
            }).error(function (jqXHR, textStatus, errorThrown) {
                console.log(jqXHR)
            });
        });
}


$(window).data('ajaxready', true).scroll(function (e) {
    // console.log('enter')
    var postHeight = $('.row').height();
    // console.log('postHeight:' + postHeight);
    // console.log('$(window).data(\'ajaxready\'):' + $(window).data('ajaxready'));
    // console.log('$(window).scrollTop():' + $(window).scrollTop());
    // console.log('$(window).height():' + $(window).height());

    if ($(window).data('ajaxready') === false) {
        console.log('=============');
        return;
    }
    if ($(window).scrollTop() >= postHeight - $(window).height() - 200) {
        // var height = $(window).scrollTop();
        $('div#loadmoreajaxloader').show();
        $(window).data('ajaxready', false);
        $.ajax({
            url: '/api/image/randoms/',
            type: 'GET',
            data: {'page': page},
            success: function (data) {
                console.log('success');
                console.log(page);
                var result = format_data(data);
                if (result !== '') {
                    page += 1;
                }
                $('.row').append(result);
                new LazyLoad();
                $('div#loadmoreajaxloader').hide();
                $(window).data('ajaxready', true);
            }
        });
    }
});