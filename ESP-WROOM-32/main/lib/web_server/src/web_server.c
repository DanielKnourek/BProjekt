#include "web_server.h"

// general include
#include <stdint.h>
#include <stdlib.h>

#include "esp_log.h"
#include <inttypes.h>
#include <string.h>

// handler specific
#include "driver/gpio.h"
#include "esp_random.h"
#include "serial_link.h"

static const char* TAG = "http_server.c";

#define HTTP_SERVER_PORT CONFIG_HTTP_SERVER_PORT

typedef struct {
    httpd_req_t *req;
} sse_task_ctx_t;

static esp_err_t handler_api_error(httpd_req_t* req) {
#define STR "Invalid request"
    httpd_resp_send(req, STR, strlen(STR));
    return ESP_OK;
#undef STR
}

static esp_err_t handler_get_api_status(httpd_req_t* req) {
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_set_type(req, "application/json");
    const char* resp = "{\"status\":\"ok\"}";
    return httpd_resp_send(req, resp, strlen(resp));
}

static esp_err_t get_api_query_buf(httpd_req_t* req, char** query_buf) {
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

    size_t buf_len = httpd_req_get_url_query_len(req) + 1;
    if (buf_len <= 1) {
        ESP_LOGI(TAG, "No request params set!");
        return ESP_FAIL;
    }
    if (buf_len > 1024) {
        ESP_LOGI(TAG, "Request params too long!");
        return ESP_FAIL;
    }
    *query_buf = malloc(buf_len);
    if (!*query_buf) {
        return ESP_FAIL;
    }

    if (httpd_req_get_url_query_str(req, *query_buf, buf_len) != ESP_OK) {
        ESP_LOGI(TAG, "cannot load query string");
        free(*query_buf);
        return ESP_FAIL;
    }
    return ESP_OK;
}

static esp_err_t handler_get_api_led(httpd_req_t* req) {
#define STR "LED status"
    char* buf;
    if (get_api_query_buf(req, &buf) != ESP_OK) {
        return handler_api_error(req);
    }

    char param[32];
    if (httpd_query_key_value(buf, "LED1", param, sizeof(param)) == ESP_OK) {
        ESP_LOGI(TAG, "Found URL query parameter => query1=%s", param);
        uint8_t led1_req = atoi(param);
        gpio_set_level(2, led1_req);
        send_test_int_config(led1_req > 0);
    }
    httpd_resp_send(req, STR, strlen(STR));

    free(buf);
    return ESP_OK;
#undef STR
}

static esp_err_t handler_get_api_program1(httpd_req_t* req) {
    char* buf;
    if (get_api_query_buf(req, &buf) != ESP_OK) {
        return handler_api_error(req);
    }

    char param[32];
    if (httpd_query_key_value(buf, "en", param, sizeof(param)) == ESP_OK) {
        uint8_t req_val = atoi(param);
        gpio_set_level(2, req_val);
        send_test_int_config(req_val > 0);
    }
    
    const char* resp = "Program 1 status";
    httpd_resp_send(req, resp, strlen(resp));
    free(buf);
    return ESP_OK;
}

static esp_err_t handler_get_api_program2(httpd_req_t* req) {
    char* buf;
    if (get_api_query_buf(req, &buf) != ESP_OK) {
        return handler_api_error(req);
    }

    char param[32];
    if (httpd_query_key_value(buf, "en", param, sizeof(param)) == ESP_OK) {
        uint8_t req_val = atoi(param);
        uint32_t payload_size = 1024;
        if (httpd_query_key_value(buf, "payload_size", param, sizeof(param)) == ESP_OK) {
            payload_size = strtoul(param, NULL, 10);
        }
        send_test_bandwidth_config(req_val > 0, payload_size);
    }
    
    const char* resp = "Program 2 status";
    httpd_resp_send(req, resp, strlen(resp));
    free(buf);
    return ESP_OK;
}

static esp_err_t handler_get_api_program3(httpd_req_t* req) {
    char* buf;
    if (get_api_query_buf(req, &buf) != ESP_OK) {
        return handler_api_error(req);
    }

    char param[32];
    if (httpd_query_key_value(buf, "en", param, sizeof(param)) == ESP_OK) {
        uint8_t req_val = atoi(param);
        uint32_t sample_rate_hz = 0;
        uint32_t samples_per_frame = 0;
        
        if (httpd_query_key_value(buf, "sample_rate_hz", param, sizeof(param)) == ESP_OK) {
            sample_rate_hz = strtoul(param, NULL, 10);
        }
        
        if (httpd_query_key_value(buf, "samples_per_frame", param, sizeof(param)) == ESP_OK) {
            samples_per_frame = strtoul(param, NULL, 10);
        }
        
        send_stream_config(req_val > 0, sample_rate_hz, samples_per_frame);
    }
    
    const char* resp = "Program 3 status";
    httpd_resp_send(req, resp, strlen(resp));
    free(buf);
    return ESP_OK;
}


static esp_err_t handler_ws_program3data(httpd_req_t *req) {
    if (req->method == HTTP_GET) {
        ESP_LOGI("WEB", "WebSocket DAC stream handshake successful");
        return ESP_OK;
    }

    httpd_ws_frame_t ws_pkt;
    uint8_t *buf = NULL;
    memset(&ws_pkt, 0, sizeof(httpd_ws_frame_t));
    ws_pkt.type = HTTPD_WS_TYPE_BINARY;

    // Get frame length
    esp_err_t ret = httpd_ws_recv_frame(req, &ws_pkt, 0);
    if (ret != ESP_OK) {
        ESP_LOGE("WEB", "httpd_ws_recv_frame failed to get length with %d", ret);
        return ret;
    }

    if (ws_pkt.len > 0) {
        buf = calloc(1, ws_pkt.len + 1);
        if (!buf) {
            ESP_LOGE("WEB", "Failed to allocate memory for WS payload");
            return ESP_ERR_NO_MEM;
        }
        ws_pkt.payload = buf;
        ret = httpd_ws_recv_frame(req, &ws_pkt, ws_pkt.len);
        if (ret != ESP_OK) {
            ESP_LOGE("WEB", "httpd_ws_recv_frame failed with %d", ret);
            free(buf);
            return ret;
        }

        if (ws_pkt.type == HTTPD_WS_TYPE_BINARY) {
            // Forward raw binary samples to STM32
            send_stream_data((int32_t*)ws_pkt.payload, ws_pkt.len / sizeof(int32_t));
        }
        free(buf);
    }
    return ESP_OK;
}

static void random_sse_task(void *arg) {
    sse_task_ctx_t *ctx = (sse_task_ctx_t *)arg;
    httpd_req_t *req = ctx->req;
    int random_val = 0;
    char str[64];

    for (size_t i = 0; i < 45; i++) {
        esp_fill_random(&random_val, sizeof(random_val));
        ESP_LOGI(TAG, "Random number generated: %d", random_val);
        
        sprintf(str, "data: Rand:%d\n\n", random_val);
        httpd_resp_send_chunk(req, str, strlen(str));

        vTaskDelay(1000 / portTICK_PERIOD_MS);
    }
    
    ESP_LOGI(TAG, "All number generated");
    httpd_resp_sendstr_chunk(req, NULL);
    
    httpd_req_async_handler_complete(req);
    free(ctx);
    vTaskDelete(NULL);
}

static esp_err_t handler_get_api_random(httpd_req_t* req) {
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_set_hdr(req, "Cache-Control", "no-cache");
    httpd_resp_set_hdr(req, "Content-Type", "text/event-stream");

    httpd_req_t *req_copy = NULL;
    if (httpd_req_async_handler_begin(req, &req_copy) != ESP_OK) {
        return ESP_FAIL;
    }

    sse_task_ctx_t *ctx = malloc(sizeof(sse_task_ctx_t));
    ctx->req = req_copy;
    
    xTaskCreate(random_sse_task, "random_sse", 4096, ctx, 4, NULL);

    return ESP_OK;
}

#define MAX_STREAM_SUBSCRIBERS 4

typedef struct {
    int32_t *adc_values;
    size_t n_adc_values;
} stream_data_payload_t;

static QueueHandle_t stream_queues[MAX_STREAM_SUBSCRIBERS] = {NULL};
static SemaphoreHandle_t stream_mutex = NULL;

void web_server_push_adc_values(const int32_t *adc_values, size_t n_adc_values) {
    if (n_adc_values == 0 || stream_mutex == NULL) return;

    if (xSemaphoreTake(stream_mutex, portMAX_DELAY) == pdTRUE) {
        for(int i = 0; i < MAX_STREAM_SUBSCRIBERS; i++) {
            if(stream_queues[i] != NULL) {
                stream_data_payload_t payload;
                payload.n_adc_values = n_adc_values;
                payload.adc_values = malloc(n_adc_values * sizeof(int32_t));
                if (payload.adc_values) {
                    memcpy(payload.adc_values, adc_values, n_adc_values * sizeof(int32_t));
                    if (xQueueSend(stream_queues[i], &payload, 0) != pdPASS) {
                        free(payload.adc_values);
                    }
                }
            }
        }
        xSemaphoreGive(stream_mutex);
    }
}

static void program3stream_sse_task(void *arg) {
    sse_task_ctx_t *ctx = (sse_task_ctx_t *)arg;
    httpd_req_t *req = ctx->req;

    QueueHandle_t q = xQueueCreate(10, sizeof(stream_data_payload_t));
    if (!q) {
        httpd_req_async_handler_complete(req);
        free(ctx);
        vTaskDelete(NULL);
        return;
    }
    
    int q_idx = -1;
    if (xSemaphoreTake(stream_mutex, portMAX_DELAY) == pdTRUE) {
        for(int i = 0; i < MAX_STREAM_SUBSCRIBERS; i++) {
            if(stream_queues[i] == NULL) {
                stream_queues[i] = q;
                q_idx = i;
                break;
            }
        }
        xSemaphoreGive(stream_mutex);
    }

    if (q_idx == -1) {
        ESP_LOGE(TAG, "Max stream subscribers reached");
        vQueueDelete(q);
        httpd_req_async_handler_complete(req);
        free(ctx);
        vTaskDelete(NULL);
        return;
    }

    stream_data_payload_t payload;

    while (1) {
        if (xQueueReceive(q, &payload, portMAX_DELAY) == pdTRUE) {
            size_t bytes_to_send = payload.n_adc_values * sizeof(int32_t);
            esp_err_t err = httpd_resp_send_chunk(req, (const char*)payload.adc_values, bytes_to_send);
            free(payload.adc_values);

            if (err != ESP_OK) {
                ESP_LOGI(TAG, "Client disconnected from stream");
                break;
            }
        }
    }

    if (xSemaphoreTake(stream_mutex, portMAX_DELAY) == pdTRUE) {
        stream_queues[q_idx] = NULL;
        xSemaphoreGive(stream_mutex);
    }
    
    while(xQueueReceive(q, &payload, 0) == pdTRUE) {
        free(payload.adc_values);
    }
    
    vQueueDelete(q);
    
    httpd_req_async_handler_complete(req);
    free(ctx);
    vTaskDelete(NULL);
}

static esp_err_t handler_get_api_program3stream(httpd_req_t* req) {
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_set_hdr(req, "Content-Type", "application/octet-stream");

    httpd_req_t *req_copy = NULL;
    if (httpd_req_async_handler_begin(req, &req_copy) != ESP_OK) {
        return ESP_FAIL;
    }

    sse_task_ctx_t *ctx = malloc(sizeof(sse_task_ctx_t));
    if (!ctx) {
        return ESP_FAIL;
    }
    ctx->req = req_copy;
    
    xTaskCreate(program3stream_sse_task, "prog3str_sse", 4096, ctx, 4, NULL);

    return ESP_OK;
}

static esp_err_t handler_get_api_program2stats(httpd_req_t* req) {
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    
    bandwidth_stats_t stats;
    serial_link_get_bandwidth_stats(&stats);
    
    char resp[128];
    snprintf(resp, sizeof(resp), "{\"sent\": %" PRIu32 ", \"received\": %" PRIu32 "}", 
             stats.sent, stats.received);
    
    httpd_resp_set_type(req, "application/json");
    httpd_resp_send(req, resp, strlen(resp));
    return ESP_OK;
}

static esp_err_t app_frontend_handler(httpd_req_t* req) {
    extern const unsigned char upload_script_start[] asm("_binary_index_html_start");
    extern const unsigned char upload_script_end[]   asm("_binary_index_html_end");
    const size_t upload_script_size = (upload_script_end -
    upload_script_start);

    /* Add file upload form and script which on execution sends a POST
    request to /upload */
    httpd_resp_send_chunk(req, (const char*)upload_script_start,
                          upload_script_size);
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
    { // TODO: scheduled for removal (demo endpoint)
        .uri = "/api/led",
        .method = HTTP_GET,
        .handler = handler_get_api_led,
        .user_ctx = NULL,
    },
    {
        .uri = "/api/program1",
        .method = HTTP_GET,
        .handler = handler_get_api_program1,
        .user_ctx = NULL,
    },
    {
        .uri = "/api/program2",
        .method = HTTP_GET,
        .handler = handler_get_api_program2,
        .user_ctx = NULL,
    },
    {
        .uri = "/api/program3",
        .method = HTTP_GET,
        .handler = handler_get_api_program3,
        .user_ctx = NULL,
    },
    {
        .uri = "/api/program2stats",
        .method = HTTP_GET,
        .handler = handler_get_api_program2stats,
        .user_ctx = NULL,
    },
    { // TODO: scheduled for removal (demo endpoint)
        .uri = "/api/random",
        .method = HTTP_GET,
        .handler = handler_get_api_random,
        .user_ctx = NULL,
    },
    {
        .uri = "/api/program3stream",
        .method = HTTP_GET,
        .handler = handler_get_api_program3stream,
        .user_ctx = NULL,
    },
    {
        .uri = "/api/program3data",
        .method = HTTP_GET,
        .handler = handler_ws_program3data,
        .user_ctx = NULL,
        .is_websocket = true
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
    server_config.lru_purge_enable = true;

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
    
    if (stream_mutex == NULL) {
        stream_mutex = xSemaphoreCreateMutex();
    }
    
    server_handle = start_webserver();
    serial_link_set_stream_adc_cb(web_server_push_adc_values);
}
