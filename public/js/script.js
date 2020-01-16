$(function(){
  function get2digits (num){
    return ('0' + num).slice(-2);
  }

  function getDate(dateObj){
    if(dateObj instanceof Date)
      return dateObj.getFullYear() + '-' + get2digits(dateObj.getMonth()+1)+ '-' + get2digits(dateObj.getDate());
  }

  function getTime(dateObj){
    if(dateObj instanceof Date)
      return get2digits(dateObj.getHours()) + ':' + get2digits(dateObj.getMinutes())+ ':' + get2digits(dateObj.getSeconds());
  }

  function convertDate(){
    $('[data-date]').each(function(index,element){
      //console.log(element)
      var dateString = $(element).data('date');
      if(dateString){
        var date = new Date(dateString);
        $(element).html(getDate(date));
      }
    });
  }

  function convertDateTime(){
    $('[data-date-time]').each(function(index,element){
      var dateString = $(element).data('date-time');
      if(dateString){
        var date = new Date(dateString);
        $(element).html(getDate(date)+' '+getTime(date));
      }
    });
  }

  convertDate();
  convertDateTime();
});

$(function(){
  var search = window.location.search;
  var params = {};

  if(search){
    $.each(search.slice(1).split('&'),function(index,param){
      var index = param.indexOf('=');
      if(index>0){
        var key = param.slice(0,index);
        var value = param.slice(index+1);

        if(!params[key]) params[key] = value;
      }
    });
  }

  if(params.searchText && params.searchText.length>=3){
    $('[data-search-highlight]').each(function(index,element){
      var $element = $(element);
      var searchHighlight = $element.data('search-highlight');
      var index = params.searchType.indexOf(searchHighlight);

      if(index>=0){
        var decodedSearchText = params.searchText.replace(/\+/g, ' ');
        decodedSearchText = decodeURI(decodedSearchText);
        
        var regex = new RegExp(`(${decodedSearchText})`,'ig');
        $element.html($element.html().replace(regex,'<span class="highlighted">$1</span>'));
      }
    });
  }
});
