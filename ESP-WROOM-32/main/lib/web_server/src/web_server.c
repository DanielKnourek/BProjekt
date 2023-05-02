#include "web_server.h"

// general include
#include <stdlib.h>

#include "esp_log.h"
#include "freertos/FreeRTOS.h"

// handler specific
#include "driver/gpio.h"

static const char* TAG = "http_server.c";

#define HTTP_SERVER_PORT CONFIG_HTTP_SERVER_PORT

static esp_err_t handler_api_error(httpd_req_t* req) {
#define STR "Invalid request"
    httpd_resp_send(req, STR, strlen(STR));
    return ESP_OK;
#undef STR
}

static esp_err_t handler_get_api_status(httpd_req_t* req) {
#define STR "Api for ESP is running. \n"
    ESP_LOGI(TAG, "Free Stack for server task: '%d'",
             uxTaskGetStackHighWaterMark(NULL));
    httpd_resp_send(req, STR, strlen(STR));
    return ESP_OK;
#undef STR
}

static esp_err_t handler_get_api_led(httpd_req_t* req) {
#define STR "LED status"
    char* buf;
    size_t buf_len;

    buf_len = httpd_req_get_url_query_len(req) + 1;
    if (buf_len < 1) {
        ESP_LOGI(TAG, "No request params set!");
        return handler_api_error(req);
    }
    if (buf_len > 1024) {
        ESP_LOGI(TAG, "Request params too long!");
        return handler_api_error(req);
    }
    buf = malloc(buf_len);

    if (httpd_req_get_url_query_str(req, buf, buf_len) != ESP_OK) {
        ESP_LOGI(TAG, "cannot load query string");
        return handler_api_error(req);
    }
    char param[32];
    if (httpd_query_key_value(buf, "LED1", param, sizeof(param)) == ESP_OK) {
        ESP_LOGI(TAG, "Found URL query parameter => query1=%s", param);
        uint8_t led1_req = atoi(param);
        gpio_set_level(2, led1_req);
    }
    httpd_resp_send(req, STR, strlen(STR));

    free(buf);
    return ESP_OK;
#undef STR
}

static esp_err_t app_frontend_handler(httpd_req_t* req) {
    // extern const unsigned char upload_script_start[]
    // asm("_binary_index_html_start"); extern const unsigned char
    // upload_script_end[]   asm("_binary_index_html_end"); const size_t
    // upload_script_size = (upload_script_end - upload_script_start);

    // /* Add file upload form and script which on execution sends a POST
    // request to /upload */ httpd_resp_send_chunk(req, (const char
    // *)upload_script_start, upload_script_size);
    httpd_resp_sendstr_chunk(req, NULL);
    return ESP_OK;
}

static const httpd_uri_t default_paths[] = {
    {
        .uri = "/api/status",
        .method = HTTP_GET,
        .handler = handler_get_api_status,
        .user_ctx = NULL,
    },
    {
        .uri = "/api/led",
        .method = HTTP_GET,
        .handler = handler_get_api_led,
        .user_ctx = NULL,
    },
    {
        .uri = "*",
        .method = HTTP_GET,
        .handler = app_frontend_handler,
        .user_ctx = NULL,
    }};

static const int default_paths_no = sizeof(default_paths) / sizeof(httpd_uri_t);

static void register_default_paths(httpd_handle_t server) {
    for (int i = 0; i < default_paths_no; i++) {
        if (httpd_register_uri_handler(server, &default_paths[i]) != ESP_OK) {
            ESP_LOGW(TAG, "register uri failed for %d", i);
            return;
        }
    }
    ESP_LOGI(TAG, "Default paths handler registered.");
}

httpd_handle_t start_webserver(void) {
    httpd_handle_t server = NULL;

    // server configuration
    httpd_config_t server_config = HTTPD_DEFAULT_CONFIG();
    server_config.max_uri_handlers = 12;
    server_config.server_port = HTTP_SERVER_PORT;
    server_config.uri_match_fn = httpd_uri_match_wildcard;

    /* This check should be a part of http_server */
    server_config.max_open_sockets = (CONFIG_LWIP_MAX_SOCKETS - 3);

    // server initialization
    if (httpd_start(&server, &server_config) != ESP_OK) {
        return NULL;
    }

    // uri handler registration
    register_default_paths(server);

    return server;
}

void stop_webserver(httpd_handle_t server) {
    if (server) {
        ESP_LOGI(TAG, "HTTPD Stoping...");
        httpd_stop(server);
    }
}

httpd_handle_t* server_handle;

/**
 *  Starts HTTP server on esp.
 */
void web_server_start() {
    ESP_LOGI(TAG, "starting http server at port %d", HTTP_SERVER_PORT);
    server_handle = start_webserver();
}
