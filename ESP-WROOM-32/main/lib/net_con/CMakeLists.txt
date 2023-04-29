idf_component_register(SRCS "src/net_con.c"
                            "src/wifi_client.c"
                            "src/wifi_AP.c"
                    INCLUDE_DIRS "inc"
                    PRIV_REQUIRES "nvs_flash")