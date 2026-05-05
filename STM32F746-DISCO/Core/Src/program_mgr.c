#include "program_mgr.h"
#include "serial_link.h"

static TestIntConfig test_int_config = TestIntConfig_init_zero;
static TestBandwidthConfig test_bandwidth_config = TestBandwidthConfig_init_zero;
static StreamConfig stream_config = StreamConfig_init_zero;

// Timing variables
static uint32_t last_test_int_tick = 0;
static uint32_t last_bandwidth_tick = 0;
static uint32_t last_stream_tick = 0;

static int32_t test_int_counter = 0;

void ProgramMgr_Init(void) {
    // configure pins
	GPIO_InitTypeDef GPIO_InitStruct = {0};
	GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;
	GPIO_InitStruct.Pull = GPIO_NOPULL;
	GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;

	// D3
	GPIO_InitStruct.Pin = ARDUINO_PWM_D3_Pin;
	HAL_GPIO_Init(ARDUINO_PWM_D3_GPIO_Port, &GPIO_InitStruct);
	// D4
	GPIO_InitStruct.Pin = ARDUINO_D4_Pin;
	HAL_GPIO_Init(ARDUINO_D4_GPIO_Port, &GPIO_InitStruct);
	// D5
	GPIO_InitStruct.Pin = ARDUINO_PWM_CS_D5_Pin;
	HAL_GPIO_Init(ARDUINO_PWM_CS_D5_GPIO_Port, &GPIO_InitStruct);
}

void ProgramMgr_SetTestIntConfig(TestIntConfig *config) {
    test_int_config = *config;
    
    HAL_GPIO_WritePin(ARDUINO_PWM_D3_GPIO_Port, ARDUINO_PWM_D3_Pin, 
        test_int_config.enable ? GPIO_PIN_SET : GPIO_PIN_RESET);
}

void ProgramMgr_SetTestBandwidthConfig(TestBandwidthConfig *config) {
    test_bandwidth_config = *config;

    HAL_GPIO_WritePin(ARDUINO_D4_GPIO_Port, ARDUINO_D4_Pin, 
        test_bandwidth_config.enable ? GPIO_PIN_SET : GPIO_PIN_RESET);
}

void ProgramMgr_SetStreamConfig(StreamConfig *config) {
    stream_config = *config;

    HAL_GPIO_WritePin(ARDUINO_PWM_CS_D5_GPIO_Port, ARDUINO_PWM_CS_D5_Pin, 
        test_bandwidth_config.enable ? GPIO_PIN_SET : GPIO_PIN_RESET);
}

void ProgramMgr_Process(void) {
    uint32_t tick = HAL_GetTick();

    // 1. Process Test Int
    if (test_int_config.enable && (tick - last_test_int_tick >= 5000)) {
        last_test_int_tick = tick;
        test_int_counter++;
        SerialLink_SendTestIntData(test_int_counter);
    }

    // 2. Process Test Bandwidth
    if (test_bandwidth_config.enable && (tick - last_bandwidth_tick >= 10)) {
        last_bandwidth_tick = tick;
        
        uint32_t size = test_bandwidth_config.has_payload_size ? test_bandwidth_config.payload_size : 1024;
        if (size > 1024) size = 1024; // cap to max array size
        
        uint8_t dummy[1024]; // allocate dummy buffer
        // For bandwidth test, filling pattern isn't strictly necessary, but we can do a quick memset
        memset(dummy, 0xAB, size);
        
        SerialLink_SendTestBandwidthData(dummy, size);
    }

    // 3. Process Stream
    if (stream_config.enable) {
        uint32_t samples_per_frame = stream_config.has_samples_per_frame ? stream_config.samples_per_frame : 100;
        uint32_t sample_rate = stream_config.has_sample_rate_hz ? stream_config.sample_rate_hz : 1000;
        
        // Calculate milliseconds per frame
        uint32_t frame_interval_ms = (samples_per_frame * 1000) / sample_rate;
        if (frame_interval_ms == 0) frame_interval_ms = 1;
        
        if (tick - last_stream_tick >= frame_interval_ms) {
            last_stream_tick = tick;
            
            if (samples_per_frame > 1000) samples_per_frame = 1000;
            
            int32_t mock_adc[1000];
            for (int i=0; i<samples_per_frame; i++) {
                // Mock value: simple sawtooth based on tick
                mock_adc[i] = (tick + i) % 4096; 
            }
            
            // Send ADC values, empty DAC values
            SerialLink_SendStreamData(mock_adc, samples_per_frame, NULL, 0);
        }
    }
}
