package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
)

func main() {
	targetURL, err := url.Parse("https://api2.sec-tunnel.com")
	if err != nil {
		log.Fatal("Invalid target URL:", err)
	}

	proxy := httputil.NewSingleHostReverseProxy(targetURL)

	// Modify the request before it is sent to the target
	proxy.Director = func(req *http.Request) {
		req.URL.Scheme = targetURL.Scheme
		req.URL.Host = targetURL.Host
		// Ensure the Host header matches the target to bypass SNI/routing issues
		req.Host = targetURL.Host

		// Remove headers that might expose that we are a proxy
		req.Header.Del("X-Forwarded-For")
		req.Header.Del("X-Forwarded-Proto")
		req.Header.Del("X-Real-Ip")
	}

	// Wrapper to only allow /v4/ endpoints and log requests
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if len(r.URL.Path) < 4 || r.URL.Path[:4] != "/v4/" {
			http.Error(w, "Not found. This relay only proxies /v4/* to api2.sec-tunnel.com.", http.StatusNotFound)
			return
		}
		
		log.Printf("[relay] %s %s -> %s%s", r.Method, r.URL.Path, targetURL.String(), r.URL.Path)
		proxy.ServeHTTP(w, r)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Printf("[relay] Opera API relay listening on http://0.0.0.0:%s", port)
	log.Printf("[relay] Proxying /v4/* -> https://api2.sec-tunnel.com/v4/*")
	
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}
