#include "wifi_client.h"

// general include
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "sdkconfig.h"

// wifi AP
#include <string.h>

#include "esp_event.h"
#include "esp_system.h"
#include "esp_wifi.h"
#include "freertos/event_groups.h"

#define WIFI_FB_AP_SSID CONFIG_WIFI_FB_AP_SSID
#define WIFI_FB_AP_PASSWORD CONFIG_WIFI_FB_AP_PASSWORD
#define WIFI_FB_AP_CHANNEL CONFIG_WIFI_FB_AP_CHANNEL
#define WIFI_FB_AP_CONN CONFIG_WIFI_FB_AP_CONN

static const char* TAG = "wifi client";

/* The event group allows multiple bits for each event, but we only care about
 * two events:
 * - we are connected to the AP with an IP
 * - we failed to connect after the maximum amount of retries */
#define WIFI_CONNECTED_BIT BIT0
#define WIFI_FAIL_BIT BIT1

/* FreeRTOS event group to signal when we are connected*/
static EventGroupHandle_t s_wifi_event_group;

static int s_retry_num = 0;

static void wifi_event_handler(void* arg, esp_event_base_t event_base,
                               int32_t event_id, void* event_data) {
    if (event_id == WIFI_EVENT_AP_STACONNECTED) {
        wifi_event_ap_staconnected_t* event =
            (wifi_event_ap_staconnected_t*)event_data;
        ESP_LOGI(TAG, "station " MACSTR " join, AID=%d", MAC2STR(event->mac),
                 event->aid);
    } else if (event_id == WIFI_EVENT_AP_STADISCONNECTED) {
        wifi_event_ap_stadisconnected_t* event =
            (wifi_event_ap_stadisconnected_t*)event_data;
        ESP_LOGI(TAG, "station " MACSTR " leave, AID=%d", MAC2STR(event->mac),
                 event->aid);
    }
}

esp_err_t start_WiFi_AP() {
    esp_netif_create_default_wifi_ap();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    ESP_ERROR_CHECK(esp_event_handler_instance_register(
        WIFI_EVENT, ESP_EVENT_ANY_ID, &wifi_event_handler, NULL, NULL));

    wifi_config_t wifi_config = {
        .ap = {.ssid = WIFI_FB_AP_SSID,
               .ssid_len = strlen(WIFI_FB_AP_SSID),
               .channel = WIFI_FB_AP_CHANNEL,
               .password = WIFI_FB_AP_PASSWORD,
               .max_connection = WIFI_FB_AP_CONN,
               .authmode = WIFI_AUTH_WPA_WPA2_PSK},
    };
    if (strlen(WIFI_FB_AP_PASSWORD) == 0) {
        wifi_config.ap.authmode = WIFI_AUTH_OPEN;
    }

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_AP));
    ESP_ERROR_CHECK(esp_wifi_set_config(ESP_IF_WIFI_AP, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());

    ESP_LOGI(TAG, "wifi_init_softap finished. SSID:%s password:%s channel:%d",
             WIFI_FB_AP_SSID, WIFI_FB_AP_PASSWORD, WIFI_FB_AP_CHANNEL);

    return ESP_OK;
}