# The problem...
Calls executed by the hyperevent #call do not return values ​​to the client.

# A brief explanation of how hypervents work...
When compiling a CSP, Caché/IRIS identifies hyperevent calls and changes them to client-side request methods. For example, if there is a `#call` call on your page, after compilation, Caché/IRIS will change the `#call` call to the `cspCallHttpServerMethod` method. You can see this change in the root source code (the `.int` file).

If we analyze the cspCallHttpServerMethod in cspxmlhttp.js, we can see that if the request is asynchronous (#call), the request is made, but the return will always be null.

```javascript
...
if (async) {
	return null;
}

return cspProcessResponse(req);
```
I believe the reason this return is null is due to the limitations of JavaScript at that time, which prevented the use of Promises.

# The solution...
Instead of returning null, we can implement a Promise, so that once the AJAX request completes, we notify the client using a hook. 
```javascript
...
if (async) {
    if (cspMultipleCall) {
        if (cspActiveXMLHttp == null) cspActiveXMLHttp = new Array();
        cspActiveXMLHttp[cspActiveXMLHttp.length] = req;
        req.onreadystatechange = cspProcessMultipleReq;
    } else {
        req.onreadystatechange = cspProcessReq;
    }

    /// Implementation of the Promise that will return the result of the request.
    return new Promise((resolve, reject) => {
        req.open("POST", url, async);
        req.onload = () => {
            resolve(cspProcessResponse(req))
        }
        req.onerror = () => reject(cspProcessResponse(req))
        req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        req.send(data);
    }) 
}
```
Our cspIntHttpServerMethod method will override the default cspIntHttpServerMethod method.

The complete correction ended up like this.
```javascript
function cspIntHttpServerMethod(method, args, async)
{
    console.log("Override method csp xmlhttp")
    var arg;
    var i;
    var url = "%25CSP.Broker.cls";
    var n;
    var req;

    var data = "WARGC=" + (args.length - 1) + "&WEVENT=" + method.replace(/&amp;/,'&');
    for (i = 1; i < args.length; i++) {
        arg = args[i];
        if (typeof arg != "object") {
            // Convert boolean to Cache value before sending
            if (typeof arg == "boolean") arg = (arg ? 1 : 0);
            data = data + "&WARG_" + i + "=" + encodeURIComponent(arg);
        } else if (arg != null) {
            n = 0;
            for (var el in arg) {
                if (typeof arg[el] != "function") {
                    data = data + "&W" + i + "=" + encodeURIComponent(arg[el]);
                    n = n + 1;
                }
            }
            data = data + "&WLIST" + i + "=" + n;
        }
    }

    try {
        req=cspXMLHttp
        if (async) {
            if (cspMultipleCall) {
                if (cspActiveXMLHttp == null) cspActiveXMLHttp = new Array();
                cspActiveXMLHttp[cspActiveXMLHttp.length] = req;
                req.onreadystatechange = cspProcessMultipleReq;
            } else {
                req.onreadystatechange = cspProcessReq;
            }

            /// Implementation of the Promise that will return the result of the request.
            return new Promise((resolve, reject) => {
                req.open("POST", url, async);
                req.onload = () => {
                    resolve(cspProcessResponse(req))
                }
                req.onerror = () => reject(cspProcessResponse(req))
                req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                req.send(data);
            }) 
        }
        cspXMLHttp = null;
        if (cspUseGetMethod) {
            req.open("GET", url+"?"+data, async);
            if (cspMozilla) {
                req.send(null);
            } else {
                req.send();
            }
        } else {
            req.open("POST", url, async);
            req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            req.send(data);
        }
    } catch (e) {
        var err=new cspHyperEventError(400,'Http object request failed, unable to process HyperEvent.',null,'',e);
        return cspHyperEventErrorHandler(err);
    }

    if (async) {
        return null;
    }

    return cspProcessResponse(req);
}
`
```
Now, we can use the async/await syntax available on the client, and with this, it's possible to capture the values ​​of that promise.
```javascript
let handler = async () => {
    let result = await #call(Events.WithReturn.Execute())#
    alert(result)
}
```