/**
 * Promise in calls async
 */

document.addEventListener("DOMContentLoaded", () => {
    let asynctag = document.getElementsByTagName("async");
    let hasAsyncTag = (asynctag.length > 0);
    
    if (!hasAsyncTag) {
        return;
    }

    let script = document.createElement("script");
    script.innerHTML = `
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
    asynctag[0].appendChild(script);
});