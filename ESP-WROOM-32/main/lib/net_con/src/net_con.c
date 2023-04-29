#include "net_con.h"

#include "wifi_AP.h"
#include "wifi_client.h"

// general include
#include "esp_log.h"
#include "sdkconfig.h"

// nvs init
#include "nvs_flash.h"

// netif init
#include "esp_event.h"

static const char* TAG = "net_con.c";

void init_test() { printf("Library initialized v5\n"); }

esp_err_t nvs_init() {
    ESP_LOGI(TAG, "NVS initialization");
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES ||
        ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_LOGI(TAG, "Cannot initialize, erasing nvs.");
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);
    return ESP_OK;
}

esp_err_t init_netif() {
    ESP_LOGI(TAG, "netif initialization");
    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());

    return ESP_OK;
}

/**
 * Inicializes WiFi and starts connecting to predefined WiFi.
 * After WIFI_SEARCH_RETRIES failed attempts to connect,
 * it creates its own AP with SSID: WIFI_AP_SSID and PASS: WIFI_AP_PASSWORD
 */
void net_con_init() {
    init_test();
    nvs_init();
    init_netif();

    esp_err_t ret = start_WiFi_client();
    if (ret != ESP_OK) {
        ESP_LOGI(TAG, "Setting up AP");
        start_WiFi_AP();
    }
}
