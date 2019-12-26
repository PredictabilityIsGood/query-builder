function QueryBuilder(options={}){
  options=Object.assign({domSelector:"#query-builder",filters:null,joins:null,dLanguage:"JavaScript",callback:(item)=>console.log(item)},options);
  this.surrogate=1;
  this.rendered="";
  this.filters=[];
  this.joins=[];
  this.selected=[];
  this.domselector;
  this.domrender;
  this.dommode;
  this.domfilters;
  this.domlisteners=[];
  this.addEventListener=function(el,action,fn){
    el.addEventListener(action,fn);
    this.domlisteners.push({dom:el,fn:fn,action:action});
  }
  this.Pluck=function( rootData , bindpath=[] , set=null ){
    if(bindpath.length>1){
        return this.Pluck( rootData[bindpath[0]] , bindpath.slice(1,bindpath.length) , set );
    }
    else{
        if(bindpath.length==0){
            return rootData;
        }
        else{
            if(set==null){
                if(rootData instanceof HTMLElement){
                    return rootData.getAttribute(bindpath[0]);
                }
                else{
                    return rootData[bindpath[0]];
                }
            }
            else{
                rootData[bindpath[0]]=set;
                return rootData[bindpath[0]];
            }
        }
    }
  };
  this.isSelected=function( aFilter ){
      for(var i=0; i<this.selected.length; i++){
        if(this.selected[i].id==aFilter.id){
          return i;
      }
    }
    return -1;
  };
  this.removeSelected=function( aFilter ){
      for(var i=0;i<this.selected.length;i++){
        if(this.selected[i].id==aFilter.id){
          this.selected.splice(i,1);
      }
    }	
  }
  this.joinMode="OR";
  this.lookupStorage={ 
    crmprefix:"https://webapps3.liu.edu/newcrm/api/",
    BIToolPrefix:"https://webapps3.liu.edu/BITools/api/v1.0.0/meta/query/get/",
    campus:"BKLYN",
    term:"1192",
    career:"UGRD"
  };
  this.lookupValues=function( key , callback ){
     var qbRef=this;
    var keyname = key;
      if("options" in qbRef.keys[key]){
        callback(qbRef.keys[key]["options"]);
    }
    else if("lookup" in qbRef.keys[key]){
      function replaceMeta( replace , key , qbRef ){
        var opConditional = replace;
        //replace potential Filter attributes
        var typeReplace="";
        var typeReplacement="";
        let patt = new RegExp("\{\{\{KEY\}\}\}","gmi")
        opConditional=opConditional.replace( patt, key );

        let lookupStorageKeys = Object.keys(qbRef.lookupStorage);
        for(var i=0; i<lookupStorageKeys.length; i++){
          let patt = new RegExp("\{\{\{"+lookupStorageKeys[i].toUpperCase()+"\}\}\}","gmi");
          opConditional=opConditional.replace(patt,qbRef.lookupStorage[lookupStorageKeys[i]])
        }
        return opConditional;
      }
      var lookupReplaced ;
        var settings = {
        "async": true,
        "crossDomain": true,
        "url": replaceMeta(qbRef.keys[key]["lookup"],key,qbRef),
        "method": "GET",
        "headers": {
          "Content-Type": "application/json",
          "id": "Public",
          "token": "Public"
        },
        "error": function(request,error){
          console.log(request)
          callback(-1);
        }
      }

      $.ajax(settings).done(function(response) {
          var values=response;
        var options;
          let key = qbRef.keys[keyname];
        if("path" in key){
              if("map" in key){ 
                  options = qbRef.Pluck(values,key["path"]).map((x) => { return { "key":x[key["map"]["key"]] , "value":x[key["map"]["value"]] } })
            }
            else{
                options = qbRef.Pluck( values, key["path"])
            }
          }
          else{
              if("map" in key){  
              options = values.map((x)=>{ return { "key":x[key["map"]["key"]] , "value":x[key["map"]["value"]] } }) 
            }
            else{ 
              options = values;
            }
          }
          
          if(options.constructor=== Array && options[0].constructor===Object){
              //complex obj inside of array
            if("key" in options[0] && "value" in options[0]){
                //key value inside complex obj
              
            }
            else{
                //pick first two keys arbitrarily
              var optionKeys  = Object.keys(options[0]);
              options = options.map( (x) =>{ return {"key":x[optionKeys[0]],"value":x[optionKeys[1]]} });
            }
          }
          else if(options.constructor===Array){
              //Just take the value as both key and value
            options = options.map( (x) => { return {"key":x,"value":x} });
          }
          else{
              //Improper Format
            options=-1;
            console.log("Options for key '"+keyname+"' in invalid format. Must be at minimum array or have a path attribute to the array");
          }
          qbRef.keys[keyname]["options"]=options;//Set cleaned up options for re-use if necessary
                          callback(qbRef.keys[keyname]["options"]);
      });
    }
    else{
      callback(-1);
    }
    
  };
  this.keys={
	  "Campus":{
      "type":"string",
		  //"lookup":"{{{crmprefix}}}schedule/{{{campus}}}"
    },
    "AdmitTerm":{
      "type":"string",
      //"lookup":"https://webapps.liu.edu/newcrm/api/lookup/campus/{{{CAMPUS}}}"
    },
    "AdmitType":{
      "type":"string"
    },
    "Courses":{
      "type":"string",
      "lookup":"{{{BIToolPrefix}}}Util.Courses?Campus={{{CAMPUS}}}&Term={{{TERM}}}&Career={{{CAREER}}}",
      "path":["Data"],
      "map":{ "key":"class_number" , "value":"class_number" }
    },
	  "Applying Term":{
        "type":"string"
    },
	
  };
  this.defaultOperator=options.dLanguage;
  this.customOperators={
    "SQL":{
      "operators":{
        "like":{
          "type":"single",
          "value":"{{{KEY}}} LIKE {{{VALUE}}}"
        },
        "=":{
          "type":"single",
          "value":"{{{KEY}}}{{{OPERATOR}}}{{{VALUE}}}"
        },
        ">":{
          "type":"single",
          "value":"{{{KEY}}}{{{OPERATOR}}}{{{VALUE}}}"
        },
        ">=":{
          "type":"single",
          "value":"{{{KEY}}}{{{OPERATOR}}}{{{VALUE}}}"
          
        },
        "<":{
          "type":"single",
          "value":"{{{KEY}}}{{{OPERATOR}}}{{{VALUE}}}"
        },
        "<=":{
          "type":"single",
          "value":"{{{KEY}}}{{{OPERATOR}}}{{{VALUE}}}"
        },
        "in":{
          "type":"multiple",
          "value":"{{{KEY}}} IN ({{{VALUE}}})"
        },
        "not in":{
          "type":"multiple",
          "value":"{{{KEY}}} NOT IN ({{{VALUE}}})"
        },
        "virtual":{
          "type":"custom",
          "value":"{{{VALUE}}}"
        }
      },
      "join":(item)=>{
        return item;
      }
    },
    "JavaScript":{
      "operators":{
        "like":{
          "type":"single",
          "value":"row[\"{{{KEY}}}\"].indexOf({{{VALUE}}})!=-1"
        },
        "=":{
          "type":"single",
          "value":"row[\"{{{KEY}}}\"]{{{OPERATOR}}}{{{VALUE}}}"
        },
        ">":{
          "type":"single",
          "value":"row[\"{{{KEY}}}\"]{{{OPERATOR}}}{{{VALUE}}}"
        },
        ">=":{
          "type":"single",
          "value":"row[\"{{{KEY}}}\"]{{{OPERATOR}}}{{{VALUE}}}"
          
        },
        "<":{
          "type":"single",
          "value":"row[\"{{{KEY}}}\"]{{{OPERATOR}}}{{{VALUE}}}"
        },
        "<=":{
          "type":"single",
          "value":"row[\"{{{KEY}}}\"]{{{OPERATOR}}}{{{VALUE}}}"
        },
        "in":{
          "type":"multiple",
          "value":"[{{{VALUE}}}].indexOf(row[\"{{{KEY}}}\"])==0"
        },
        "not in":{
          "type":"multiple",
          "value":"[{{{VALUE}}}].indexOf(row[\"{{{KEY}}}\"])==-1"
        },
        "virtual":{
          "type":"custom",
          "value":"{{{VALUE}}}"
        }
      },
      "join":(item)=>{
        return item=="OR"?"||":"&&";
      }
    }
  };
  this.operators=this.customOperators[this.defaultOperator].operators;
  this.filterTemplate={
    "id":0,
    "dom":null,
    "key":"AdmitTerm",
    "operator":"=",
    "value":""
  };
  this.joinTemplate={
    "id":0,
    "parent":-1,
    "filters":[],
    "operator":"AND"
  } 
  this.clear=function(node){
    const myNode = node;
    while (myNode.firstChild) {
      myNode.removeChild(myNode.firstChild);
    }
  } 
  this.reset=function(){
    this.filters=[];
    this.joins=[];
    this.set();
  }
  this.set=function(){
    if(options.filters!=null && options.joins !=null){
      this.filters=filters;
      this.joins=joins;
    }
    else{
        this.addFilter();
    }
    this.domselector=options.domSelector;
    this.dom=document.querySelector(this.domselector);
    if(this.dom){
      this.domlisteners.forEach((listenerwrap)=>{
        listenerwrap.dom.removeEventListener(listenerwrap.action,listenerwrap.fn);
      })
      this.domlisteners=[];

      this.clear(this.dom);
      var render = document.createElement("div");
      render.setAttribute("class","px-4 py-3  bg-dark");
      var builderWrapper = document.createElement("div");
      builderWrapper.setAttribute("class", "p-4 bg-light border");
      
      var mode = document.createElement("div");
      mode.setAttribute("class","mb-4");
      var filters = document.createElement("div"); 
      filters.setAttribute("class","");

      builderWrapper.appendChild(mode);
      builderWrapper.appendChild(filters);

      this.domrender=render;
      this.dommode=mode;
      this.domfilters=filters;

      this.dom.appendChild(render);
      this.dom.appendChild(builderWrapper);
      this.render();
    }
  };
  this.clone=function(obj){
    var newObj = JSON.parse(JSON.stringify(obj));
    newObj.id = JSON.parse(JSON.stringify(this.surrogate));
    this.surrogate++
    return newObj;
  };
  this.findFilter=function( id ){
      for(var i=0;i<this.filters.length;i++){
        if(id==this.filters[i]["id"]){
          return this.filters[i]
      }
    }
  };
  this.findFilterIndex=function( id ){
      for(var i=0;i<this.filters.length;i++){
        if(this.filters[i].id==id){
          return i;
      }
    }
  };
  this.addFilter=function(filterCopy=null){
      var copyid = filterCopy!=null && "id" in filterCopy ? filterCopy.id : -1 ;
      var newfilter = filterCopy==null ? this.clone(this.filterTemplate) : this.clone(filterCopy);
      this.filters.push(newfilter);
    
    if(this.joins.length==0){
        var newJoin = this.addJoin();
      newJoin.filters.push(newfilter.id);
    }
    else{
        if(copyid!=-1){
        var PushIntoJoins = this.findJoins(copyid);
        this.addToJoins(newfilter.id, PushIntoJoins);
      }
      else{
          this.addToJoins(newfilter.id, [this.GetBaseJoin()]);
      }
    }          
  };
  this.removeFilter=function(filterRemove=null){
      if(filterRemove==null){
        filterRemove=this.filters[this.filters.length-1];
    }
    var joinsToRemove = this.findJoins( filterRemove.id );
    for(var i=0;i<this.filters.length;i++){
        if(filterRemove.id==this.filters[i].id){
          this.filters.splice(i,1);
      }
    }
    this.removeFromJoins( filterRemove.id , joinsToRemove );
  };
  this.getBaseJoin=function(){
      for(var i=0; i<this.joins.length; i++){
        if(this.joins[i].parent==-1){
          return this.joins[i];
      }
    }
  };
  this.addJoin=function( parentid=-1 ){
      var newJoin = this.clone(this.joinTemplate);
    this.joins.push(newJoin);
    newJoin.parent=parentid;
    return newJoin;
  };
  this.deleteJoin=function( id ){
      for(var i=0; i<this.joins.length; i++){
        if(this.joins[i].id==id){
          this.joins.splice(i,1);
      }
    }
  }
  this.findJoin=function( id ){
      for(var i=0; i<this.joins.length;i++){
        if(this.joins[i].id==id){
          return this.joins[i];
      }
    }
    return -1;
  };
  this.findJoinParent=function( id ){
    var ajoin=this.findJoin(id);
    if(ajoin==-1){
        return -1;
    }
    else{
        if("parent" in ajoin){
          if(ajoin.parent==-1){
            return -1;
        }
        else{
            return this.findJoin(ajoin.parent);
        }
      }
    }
    return -1;
    
  };
  this.findJoins=function( filterid ){
      var foundJoins=[];
      for(var i=0; i<this.joins.length;i++){
        if(this.joins[i].filters.indexOf(filterid)>=0){
          foundJoins.push(this.joins[i]);
      }
    }
    return foundJoins;
  };
  this.addToJoins=function( filterid , joins ){
      for(var i=0; i<joins.length;i++){
        if(joins[i].filters.indexOf(filterid)>=0){
      
      }
      else{
          joins[i].filters.push(filterid)
      }
    }
  };
  this.removeFromJoins=function( filterid , joins){
      var removeJoins=[];
    for(var i=0; i<joins.length;i++){
        var spliceIndex = joins[i].filters.indexOf(filterid);
        if(spliceIndex >=0){
          //remove
        joins[i].filters.splice(spliceIndex,1);
        if(joins[i].filters.length==0){
            //mark join for removal
          removeJoins.push(removeJoins)
        }
      }
    }
    
    for(var x=0;x<removeJoins.length;x++){
        for(var i=0; i<this.joins.length;i++){
          if(this.joins[i].id==removeJoins[x].id){
            this.joins.splice(i,1);
        }
      }
    }
  };
  this.fillOptions=function( options , element , selected ){
      var ops= Object.keys(options);
    for(var i=0; i< ops.length;i++){
        
        var option = document.createElement("option");
      if(ops[i]==selected){
          option.setAttribute("selected","selected")
      }
         option.setAttribute("value",ops[i]);
      option.innerHTML=ops[i];
      element.appendChild(option)
    }
  };
  this.sortJoins=function(joins){
      var affiliations=joins;
      var nestedaffiliations=[];
    for(var i=0; i<affiliations.length; i++){
        var exists=false;
        for(var x=0; x<nestedaffiliations.length;x++){
            if(affiliations[i].id ==nestedaffiliations[x].id){
            exists=true;
        }
      }
      if(!exists){
          nestedaffiliations.push(affiliations[i]);
        var proxyParent = JSON.parse(JSON.stringify(this.findJoinParent(affiliations[i].id) ));
        var previousAffId = JSON.parse(JSON.stringify(affiliations[i].id));
        while(proxyParent!=-1){
            var actualParent = this.findJoinParent(previousAffId);
          var exists=false;
          for(var x=0; x<nestedaffiliations.length;x++){
            if(actualParent.id == nestedaffiliations[x].id){
              exists=true;
            }
          }
          if(exists){
            proxyParent=-1;
          }
          else{
            proxyParent = JSON.parse(JSON.stringify(this.findJoinParent(previousAffId) ));
            previousAffId=actualParent.id;
            nestedaffiliations.splice(0,0,actualParent);  
          }
        }
      }
    }
    return nestedaffiliations;
  };
  this.renderJoins=function( filterid , element ){
    var affiliations = this.findJoins(filterid);
    var nestedaffiliations = this.sortJoins(affiliations);
    
    for(var i=0; i<nestedaffiliations.length; i++){
      let strip = document.createElement("div");
      strip.setAttribute("class","m-0 mr-2 badge badge-info");
      strip.setAttribute("style","font-weight:300;")
      strip.innerHTML="'" + nestedaffiliations[i].operator + "' - " + nestedaffiliations[i].id;
      element.appendChild(strip);
    }
  };
  this.renderFilter=function( aFilter , control ){
    var qbRef=this;
    var filterWrapper= document.createElement("div");
    filterWrapper.setAttribute("class","input-group input-group-sm mb-1");
    var filterJoins = document.createElement("div");
    filterJoins.setAttribute("class","mr-2");
    this.renderJoins(aFilter.id,filterJoins);
    var filterLabel = document.createElement("div");
    filterLabel.setAttribute("class","input-group-prepend");
    filterLabel.setAttribute("style","cursor:pointer;");
    filterLabel.innerHTML="<span class='input-group-text'>filter</span>";
    
    let filterSelect=function(){
      if(qbRef.selected.length==0){
        //apply style
        qbRef.selected.push(aFilter);
        filterLabel.classList.add("border-success","filter-selected");
      }
      else{
          //check if filter already exists
        var selectIndex = qbRef.isSelected(aFilter);
        if( selectIndex == -1 ){
            //doesn't exist check topNest Similarity to 0th
          if(aFilter.top.id == qbRef.selected[0].top.id){
            qbRef.selected.push(aFilter);
            filterLabel.classList.add("border-success","filter-selected");
          }
          else{
              alert("Item not in same nest");
          }
          
        }
        else{
            //exists remove
          qbRef.selected.splice(selectIndex,1);
          filterLabel.classList.remove("border-success","filter-selected");
        }
      }
    };
    this.addEventListener(filterLabel,"click",filterSelect)
    
    var filterKey = document.createElement("select");
    filterKey.setAttribute("class","form-control");
    this.fillOptions( this.keys , filterKey , aFilter.key);
    var filterOperator = document.createElement("select");
    filterOperator.setAttribute("class","form-control");
    filterOperator.setAttribute("style","max-width:10%;")
    this.fillOptions( this.operators , filterOperator , aFilter.operator);
    var filterValue = document.createElement("div");
    filterValue.setAttribute("class","input-group-append");
    filterValue.innerHTML="<span class='input-group-text'>Input Here</span>";
    filterValue.setAttribute("style","width:35%;")
    var filterCopy = document.createElement("button");
    filterCopy.setAttribute("class","btn btn-sm btn-outline-success input-group-prepend ml-2");
    filterCopy.appendChild(document.createTextNode("+"));
    filterCopy.setAttribute("style","border-top-right-radius:0;border-bottom-right-radius:0;")
    var filterDelete = document.createElement("button");
    filterDelete.setAttribute("class","btn btn-sm btn-outline-danger input-group-append mr-2");
    filterDelete.setAttribute("style","border-left:none;border-top-left-radius:0;border-bottom-left-radius:0;")
    filterDelete.appendChild(document.createTextNode("-"));
    
    function ResetValue(op,key,qbRef){
      qbRef.clear(filterValue)
      if(op.type=="single"){
        //input
        let input = document.createElement("input");
        input.setAttribute("type","textbox");
        input.setAttribute("style","width:100%;min-width:100%;");
        filterValue.appendChild(input); 
        qbRef.lookupValues(aFilter.key,(values)=>{
          if(values!=-1){
            var typeahead = $(input).typeahead({
              minLength: 0,
              highlight: true,
              hint:true
            },
            {
              name: 'Options',
              templates:{
                  header:"<h5 class='tt-menu-title'>"+aFilter.key+" Available</h5>"
              },
              limit:10,
              source: qbRef.substringMatcher(values.map((x) => { return x["value"]} ))
            });
            let updateTypeAhead=()=>{ aFilter.value = $(input).typeahead("val"); qbRef.renderText(); }
            qbRef.addEventListener(input,"change",updateTypeAhead);
            $(input).typeahead("val",aFilter.value);
            input.dispatchEvent(new Event("change"))
          }
          else{
            let updateVal = ()=>{ aFilter.value = $(input).val(); qbRef.renderText(); }
            qbRef.addEventListener(input,"change",updateVal);
            input.value=aFilter.value;
            input.dispatchEvent(new Event("change"))
          }
        })
        qbRef.renderText();
      }
      else if(op.type=="multiple"){
        //select
        let select = document.createElement("select");
        select.setAttribute("style","min-width:200px;width:100%;max-height:30px;")
        select.setAttribute("multiple","multiple");
        filterValue.appendChild(select);
        qbRef.lookupValues(aFilter.key,(values)=>{
          if(values != -1){
            var options=values; 
            let selected = aFilter.value.length>2 ? aFilter.value.slice(1,aFilter.value.length-1).split("','") :[];
            let choices = [];
            //Generate Options
            options.forEach((row)=>{
              let optionDom = document.createElement("option");
              optionDom.innerHTML=row["key"];
              optionDom.setAttribute("value",row["value"]);
              select.appendChild(optionDom);
              let active=selected.indexOf(JSON.stringify(row["value"]))>=0;
              choices.push({value:JSON.stringify(row["value"]),label:JSON.stringify(row["key"]),selected:active})
            });
            const choice = new Choices(select,{
                searchEnabled:true,
                removeItemButton:true,
                noResultsText: 'No results',
                maxItemCount:-1,
                choices:choices
            });
            
            let mapSelections = (e)=>{ 
              aFilter.value= choice.getValue().map((row)=>{return "'"+row["value"]+"'"}).join(",");
              qbRef.renderText();
            };
            qbRef.addEventListener(select,"change",mapSelections)
            select.dispatchEvent(new Event("change"))
          }
          else{
            qbRef.clear(filterValue)
            let input = document.createElement("input");
            input.setAttribute("type","textbox")
            input.setAttribute("style","width:100%;min-width:100%;")
            filterValue.appendChild(input); 
            let updateVal = ()=>{ aFilter.value = $(input).val(); qbRef.renderText(); }
            qbRef.addEventListener(input,"change",updateVal);
            input.value=aFilter.value;
            input.dispatchEvent(new Event("change"))
          }
        })
        qbRef.renderText()
      }
      else{
          //custom
        let input = document.createElement("input");
        input.setAttribute("type","textbox");
        input.setAttribute("style","width:100%;min-width:100%;");
        filterValue.appendChild(input); 
        let updateVal = ()=>{ aFilter.value = $(input).val(); qbRef.renderText(); }
        qbRef.addEventListener(input,"change",updateVal);
        input.value=aFilter.value;
        input.dispatchEvent(new Event("change"))
      }
    }
    
    let changeFilterKey=function(){
      aFilter.key=$(this).val();
      let op = qbRef.operators[aFilter.operator];
      let key = qbRef.keys[aFilter.key];
      ResetValue(op,key,qbRef);
    };
    this.addEventListener(filterKey,"change",changeFilterKey);
    let changeFilterOperator = function(){
      aFilter.operator=$(this).val();
      let op = qbRef.operators[aFilter.operator];
      let key = qbRef.keys[aFilter.key];
      ResetValue(op,key,qbRef);
    };
    this.addEventListener(filterOperator,"change",changeFilterOperator);  
    
    let copyFilter = function(event){
      qbRef.addFilter(aFilter);
      qbRef.render();
    }
    this.addEventListener(filterCopy,"click",copyFilter);
    
    if(this.findFilterIndex(aFilter.id)>0){
      this.addEventListener(filterDelete,"click",function(event){
        qbRef.removeFilter(aFilter);
        qbRef.render();
      });
    }
    else{
        filterDelete.innerHTML="i";
        this.addEventListener(filterDelete,"click",function(event){
        alert("Group filters with AND/OR by selecting filters and selecting apply/remove");
      });
    }
    
    filterWrapper.appendChild(filterJoins);
    filterWrapper.appendChild(filterLabel);
    filterWrapper.appendChild(filterKey);
    filterWrapper.appendChild(filterOperator);
    filterWrapper.appendChild(filterValue);
    filterWrapper.appendChild(filterCopy);
    filterWrapper.appendChild(filterDelete);
    setTimeout(function(){
        filterOperator.dispatchEvent(new Event("change")); 
    },200)
    
    aFilter.dom = { 
      "wrapper":filterWrapper , 
      "label":filterLabel, 
      "key":filterKey, 
      "operator":filterOperator, 
      "value":filterValue, 
      "copy":filterCopy, 
      "delete":filterDelete 
    };
    
    aFilter.top = qbRef.topNest(aFilter.id);
    
    return filterWrapper;
  };
  this.render=function(){
    var qb = this.domfilters;
    while(qb.firstChild){
        qb.removeChild(qb.firstChild);
    }

    var sorted=[];
    for(var i=0; i<this.filters.length;i++){
      let joins = this.findJoins(this.filters[i].id);
      let nested = this.sortJoins( joins ); 
      let joinpath = nested.map(row => row.id);
      this.filters[i].joinpath=joinpath;
      this.filters[i].joinpathlength=joinpath.length;
      this.filters[i].joinpathstr=joinpath.join("-");
      this.filters[i].groupstrprefix="";
      this.filters[i].groupstrsuffix="";
      sorted.push(this.filters[i]);
    }
    
    //Sort By Joined Group Path Descending
    sorted.sort(function(a,b){
      if(a.joinpathstr<b.joinpathstr){
          return 1;
      }
      else if(a.joinpathstr==b.joinpathstr){
          return 0;
      }
      else{
          return -1;
      }
    });
    this.filters=sorted;

    var control = this.renderControl();
      for(var i=0; i<this.filters.length;i++){
        qb.appendChild(this.renderFilter(this.filters[i] , control ));
    }
       
  };
  this.renderControl=function(){
    var qbRef = this;
    var joinModesWrapper = document.createElement("div");
    joinModesWrapper.setAttribute("class","btn-group");
    joinModesWrapper.setAttribute("style","margin-left:-.5rem;");
    var and = document.createElement("button");
    and.setAttribute("class","btn btn-light btn-sm" + (qbRef.joinMode=="AND" ? " active" :"" ));
    and.setAttribute("type","button");
    and.appendChild(document.createTextNode("AND"));
    var or = document.createElement("button");
    or.setAttribute("class","btn btn-light btn-sm" + (qbRef.joinMode=="OR" ? " active" :"" ));
    or.setAttribute("type","button");
    or.appendChild(document.createTextNode("OR"));
   
    
    joinModesWrapper.appendChild(and);
    joinModesWrapper.appendChild(or);
    
    this.addEventListener(and,"click",function(){
      or.classList.remove("active");
      and.classList.add("active");
      qbRef.joinMode="AND";
    });
    
    this.addEventListener(or,"click",function(){
      and.classList.remove("active");
      or.classList.add("active");
      qbRef.joinMode="OR";
    });
    
    var apply = document.createElement("button");
    apply.setAttribute("class","btn btn-secondary btn-sm m-0 ml-2");
    apply.setAttribute("type","button");
    apply.appendChild(document.createTextNode("Apply"));
    
    var remove = document.createElement("button");
    remove.setAttribute("class","btn btn-secondary btn-sm m-0 ml-1");
    remove.setAttribute("type","button");
    remove.appendChild(document.createTextNode("Remove"));

    
    var clear = document.createElement("button");
    clear.setAttribute("class","btn btn-danger btn-sm m-0 ml-2");
    clear.setAttribute("type","button");
    clear.appendChild(document.createTextNode("Reset"));
    
    
    this.addEventListener(apply,"click",function(){
      if(qbRef.selected.length!=0){
        var topJoin = qbRef.topNest(qbRef.selected[0].id);
        if(qbRef.joinMode!=topJoin.operator){
          if(topJoin.filters.length!=qbRef.selected.length){
            var newJoin = qbRef.addJoin(topJoin.id);
            newJoin.operator=JSON.parse(JSON.stringify(qbRef.joinMode));
            for(var i=0; i<qbRef.selected.length;i++){
              qbRef.addToJoins( qbRef.selected[i].id , [newJoin] );
            }
            qbRef.selected=[];
            qbRef.render();   
          }
          else{ 
            if(topJoin.parent == -1){
              var operator = topJoin.operator  == "AND" ? "OR" : "AND";
              topJoin.operator = confirm("Would you like to change the base operators to '"+operator+"'?") ? operator : topJoin.operator;
              qbRef.selected=[];
              qbRef.render();
            }
            else{
              confirm("filters condition same as ancestors level - applying this operator would do nothing. Remove current level operators?") ? $(remove).trigger("click") : "" ;
            }
          }
        }
        else{
          alert("conditions are the same - applying operator join would be pointless. Switch the operator");
        }
      }
      else{
          alert("no filters selected - can't perform apply");
      }
    })
    
    this.addEventListener(remove,"click",function(){
        if(qbRef.selected.length!=0){
            var topJoin = qbRef.topNest(qbRef.selected[0].id);
        if(topJoin.parent!=-1){
          for(var i=0; i<qbRef.selected.length;i++){
              qbRef.removeFromJoins( qbRef.selected[i].id , [topJoin] );
          }
          if(topJoin.filters.length==0){
            qbRef.deleteJoin(topJoin.id);
          }
          qbRef.selected=[];
          qbRef.render();
        }
        else{
          alert("base join is required - can't perform remove");
        }
        
      }
      else{
          alert("no filters selected - can't perform remove");
      }
    })
    
    this.addEventListener(clear,"click",function(){
      qbRef.reset();
    })
    
    var qbm = qbRef.dommode;
    this.clear(qbm)
    qbm.appendChild(joinModesWrapper);
    qbm.appendChild(apply);
    qbm.appendChild(remove);
    qbm.appendChild(clear);
    
    return { "and":and,"or":or,"apply":apply, "remove":remove };
  };
  this.conserver=function(todo,delaytime=1000){
    this.todofunc=todo;
    this.compensate=0;
    this.delay=function(todo = null){
      this.compensate++;
      var thisObj =this;
      setTimeout(function(){
        thisObj.compensate--;
        if(thisObj.compensate==0){
          if(todo==null){
              thisObj.todofunc();
          }
          else{
              todo();
          }
        }
      },delaytime)
    }
  }
  this.renderTextConserver=new this.conserver(null,20);
  this.renderText=function(){
    var qbRef=this;
    this.renderTextConserver.delay(()=>{
      //Traverse from base building group path for each filter
      var sorted=[];
      for(var i=0; i<this.filters.length;i++){
        let joins = this.findJoins(this.filters[i].id);
        let nested = this.sortJoins( joins ); 
        let joinpath = nested.map(row => row.id);
        this.filters[i].joinpath=joinpath;
        this.filters[i].joinpathlength=joinpath.length;
        this.filters[i].joinpathstr=joinpath.join("-");
        this.filters[i].groupstrprefix="";
        this.filters[i].groupstrsuffix="";
        sorted.push(this.filters[i]);
      }
      
      //Sort By Joined Group Path Descending
      sorted.sort(function(a,b){
        if(a.joinpathstr<b.joinpathstr){
            return 1;
        }
        else if(a.joinpathstr==b.joinpathstr){
            return 0;
        }
        else{
            return -1;
        }
      });

      var groupLength=0;
      var prevPath="";
      for( var i=0; i<sorted.length; i++){
        if(prevPath==sorted[i].joinpathstr){
          groupLength++;
          if(i==(sorted.length-1) && groupLength>1){
            sorted[i-(groupLength-1)].groupstrprefix="(";
            sorted[i].groupstrsuffix=")";
          }
        }
        else{
          if(groupLength>1){
            sorted[i-(groupLength)].groupstrprefix="(";
            sorted[i-1].groupstrsuffix=")";
          }
          groupLength=1;
        }
        prevPath=sorted[i].joinpathstr;
      }
      
      function replaceMeta( aFilter , qbRef ){
        let operatorObj = qbRef.operators[aFilter["operator"]];
        var opConditional = operatorObj.type=="custom" ? aFilter["value"] : operatorObj["value"];
        //replace potential Filter attributes
        let filterKeys = Object.keys(aFilter);
        for(var i=0; i<filterKeys.length; i++){
          var typeReplace="";
          var typeReplacement="";
          let patt = new RegExp("\{\{\{"+filterKeys[i].toUpperCase()+"\}\}\}","gmi")
          if(filterKeys[i]=="value"){
            if(qbRef.keys[aFilter["key"]].type=="number"){
              typeReplace=new RegExp("\'","gmi");
              opConditional=opConditional.replace( patt, aFilter[filterKeys[i]].replace(typeReplace,typeReplacement));
            }
            else{                	
              opConditional=opConditional.replace( patt, aFilter[filterKeys[i]] );
            }
          }
          else{
            opConditional=opConditional.replace( patt, aFilter[filterKeys[i]] );
          }
        }
        let lookupStorageKeys = Object.keys(qbRef.lookupStorage);
        for(var i=0; i<lookupStorageKeys.length; i++){
          let patt = new RegExp("\{\{\{"+lookupStorageKeys[i].toUpperCase()+"\}\}\}","gmi");
          opConditional=opConditional.replace(patt,qbRef.lookupStorage[lookupStorageKeys[i]])
        }
        return opConditional;
      }
      
      //render individual text (loop through following depth change)
      var conditionalConjunction="";
      var lastDepth=0;
      for(var i=0; i<sorted.length;i++){
        let differenceDepth = lastDepth-sorted[i].joinpath.length;
        lastDepth=sorted[i].joinpath.length;
        let topnest = this.findJoin(sorted[i].joinpath[sorted[i].joinpath.length-1]);
        let prefix = differenceDepth < 0 ? "(".repeat(differenceDepth*-1) : "";
        let suffix = differenceDepth > 0 ? ")".repeat(differenceDepth) : "";
        let conditional = i != 0 ? topnest["operator"] : "" ;
        if(differenceDepth==0 && sorted[i-1].groupstrsuffix==")"){
          conditional = conditional == "OR" ? "AND" : "OR";
        }
        conditional = conditional != "" ? qbRef.customOperators[qbRef.defaultOperator].join(conditional) : conditional;
        conditionalConjunction+= suffix + " " + conditional + " " + prefix + sorted[i].groupstrprefix + replaceMeta( sorted[i] , qbRef ) + sorted[i].groupstrsuffix;
      }
      conditionalConjunction+= ")".repeat(lastDepth);
      
      this.clear(qbRef.domrender)
      
      let preformattedWrap = document.createElement("pre");
      preformattedWrap.setAttribute("class","mb-0")
      preformattedWrap.setAttribute("style","overflow-x:auto;white-space:pre-wrap;word-wrap: break-word;")
      let code = document.createElement("code");
      code.setAttribute("class","text-light")
      preformattedWrap.appendChild(code);
      code.appendChild(document.createTextNode(conditionalConjunction))
      qbRef.domrender.appendChild(preformattedWrap);
      this.rendered=conditionalConjunction
      options.callback({
        filters:this.filters,
        joins:this.joins,
        keys:this.keys,
        text:this.rendered
      })
    })
  };
  this.topNest=function( filterid ){
    var qbRef=this;
    var filter = this.findFilter(filterid);
    let joins = this.findJoins(filterid);
    let nested = this.sortJoins( joins ); 
    let joinpath = nested.map(row => row.id);
    filter.joinpath=joinpath;
    filter.joinpathlength=joinpath.length;
    filter.joinpathstr=joinpath.join("-");
    var topjoin = nested[nested.length-1];
    return topjoin;
  };
  this.substringMatcher=function(strs , popper=null) {
      return function findMatches(q, cb) {
          var matches, substringRegex;
          // an array that will be populated with substring matches
          matches = [];
          // regex used to determine if a string contains the substring `q`
          q=q.replace("*","\\*")
          substringRegex = new RegExp(q, 'i');
          // iterate through the pool of strings and for any string that
          // contains the substring `q`, add it to the `matches` array
          $.each(strs, function(i, str) {
              if(substringRegex.test(str)) {
                  matches.push(str);
              }
          });
          cb(matches);
          if(popper!=null){
                              
          }
      };
  };
}