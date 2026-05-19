# Set the minimum version of CMake that can be used
cmake_minimum_required(VERSION 3.20)

# Enable compile command to ease indexing with e.g. clangd
set(CMAKE_EXPORT_COMPILE_COMMANDS TRUE)

# Project definition
project(BProjekt)

# Enable CMake support for ASM and C/CPP languages
enable_language(C ASM)

set(BUILD_UNIT_0_NAME BProjekt)

# Create an executable object type
add_executable(${BUILD_UNIT_0_NAME})

# STM32CubeIDE for Visual Studio Code managed CMake file
include(cmake/vscode_generated.cmake)

# Compiler options
target_compile_options(${BUILD_UNIT_0_NAME} PRIVATE
  # User defined compiler options
)

# Linker options
target_link_options(${BUILD_UNIT_0_NAME} PRIVATE 
  # User defined linker options
)

# Add sources to executable/library
target_sources(${BUILD_UNIT_0_NAME} PRIVATE
  # Add your custom library source files here
  ${CMAKE_CURRENT_SOURCE_DIR}/Lib/nanopb/pb_encode.c
  ${CMAKE_CURRENT_SOURCE_DIR}/Lib/nanopb/pb_decode.c
  ${CMAKE_CURRENT_SOURCE_DIR}/Lib/nanopb/pb_common.c
  ${CMAKE_CURRENT_SOURCE_DIR}/Core/Src/serial_link.c
  ${CMAKE_CURRENT_SOURCE_DIR}/Core/Src/program_mgr.c
)

# Add include directories
target_include_directories(${BUILD_UNIT_0_NAME} PRIVATE
  # Add custom include paths (using CMAKE_CURRENT_SOURCE_DIR prevents path mangling)
  ${CMAKE_CURRENT_SOURCE_DIR}/Lib/flag_tools
  ${CMAKE_CURRENT_SOURCE_DIR}/Lib/nanopb
)
