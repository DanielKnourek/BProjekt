idf_component_register(SRCS "src/web_server.c"
                    INCLUDE_DIRS "inc"
                    REQUIRES "esp_http_server"
                    EMBED_FILES "dist_gz/index.html")

# target_add_binary_data(esp32.elf "index.html" BINARY) 
# target_add_binary_data(${IDF_TARGET} "index.html" BINARY) 
# target_add_binary_data(${IDF_TARGET} "index.html" BINARY)
# target_add_binary_data(BProjekt.elf "dist_gz/index.html" BINARY)