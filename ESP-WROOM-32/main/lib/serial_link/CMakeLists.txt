if(NOT CMAKE_BUILD_EARLY_EXPANSION)
    # generate protobuf sources
    add_custom_command(
        OUTPUT ${COMPONENT_DIR}/src/messenger.pb-c.c ${COMPONENT_DIR}/inc/messenger.pb-c.h
        COMMAND protoc-c --c_out=${COMPONENT_DIR}/src --proto_path=${COMPONENT_DIR} ${COMPONENT_DIR}/messenger.proto
        COMMAND ${CMAKE_COMMAND} -E rename ${COMPONENT_DIR}/src/messenger.pb-c.h ${COMPONENT_DIR}/inc/messenger.pb-c.h
        # COMMAND ${CMAKE_COMMAND} -E copy ${COMPONENT_DIR}/src/messenger.pb-c.h ${COMPONENT_DIR}/inc
        DEPENDS ${COMPONENT_DIR}/messenger.proto
        COMMENT "Generating C code from messenger.proto"
        VERBATIM
    )

    add_custom_target(
        GENERATE_PROTOC_SRCS
        DEPENDS ${COMPONENT_DIR}/src/messenger.pb-c.c ${COMPONENT_DIR}/inc/messenger.pb-c.h
    )
endif()
         
# idf component
idf_component_register(
                    SRCS "src/serial_link.c" "src/messenger.pb-c.c"
                    REQUIRES "esp_driver_uart" "protobuf-c"
                    INCLUDE_DIRS "inc")

add_dependencies(${COMPONENT_LIB} GENERATE_PROTOC_SRCS)
