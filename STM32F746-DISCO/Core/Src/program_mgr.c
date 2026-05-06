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
    
    // if (stream_config.enable) {
    //     uint32_t samples_per_frame = stream_config.has_samples_per_frame ? stream_config.samples_per_frame : 100;
    //     uint32_t sample_rate = stream_config.has_sample_rate_hz ? stream_config.sample_rate_hz : 1000;
        
    //     // Calculate milliseconds per frame
    //     uint32_t frame_interval_ms = (samples_per_frame * 1000) / sample_rate;
    //     if (frame_interval_ms == 0) frame_interval_ms = 1;
        
    //     if (tick - last_stream_tick >= frame_interval_ms) {
    //         last_stream_tick = tick;
            
    //         if (samples_per_frame > 1000) samples_per_frame = 1000;
            
    //         int32_t mock_adc[1000];
    //         for (int i=0; i<samples_per_frame; i++) {
    //             // Mock value: simple sawtooth based on tick
    //             mock_adc[i] = (tick + i) % 4096; 
    //         }
            
    //         // Send ADC values, empty DAC values
    //         SerialLink_SendStreamData(mock_adc, samples_per_frame, NULL, 0);
    //     }
    // }

    // 3. Process Stream
    if (stream_config.enable) {
        // Statically write config values
        uint32_t samples_per_frame = 10;
        uint32_t frame_rate_hz = 50; // Send 10 frames per second
        uint32_t sample_interval_ms = 1000 / (samples_per_frame * frame_rate_hz); // 10 ms per sample
        
        static int32_t adc_buffer[10];
        static uint32_t sample_index = 0;
        static uint32_t last_sample_tick = 0;
        
        // Initialize tick on first run
        if (last_sample_tick == 0) last_sample_tick = tick;
        
        // Pre-calculated 1Hz sine wave (100 samples) mapping to 0-4095
        static const uint16_t sine_wave[100] = {
            2048, 2176, 2304, 2431, 2557, 2680, 2801, 2919, 3034, 3145, 3251, 3353, 3449, 3540, 3625, 3704, 3776, 3842, 3900, 3951,
            3995, 4031, 4059, 4079, 4091, 4095, 4091, 4079, 4059, 4031, 3995, 3951, 3900, 3842, 3776, 3704, 3625, 3540, 3449, 3353,
            3251, 3145, 3034, 2919, 2801, 2680, 2557, 2431, 2304, 2176, 2048, 1919, 1791, 1664, 1538, 1415, 1294, 1176, 1061, 950,
            844, 742, 646, 555, 470, 391, 319, 253, 195, 144, 100, 64, 36, 16, 4, 0, 4, 16, 36, 64,
            100, 144, 195, 253, 319, 391, 470, 555, 646, 742, 844, 950, 1061, 1176, 1294, 1415, 1538, 1664, 1791, 1919
        };
        static uint32_t sine_index = 0;

        // Use a while loop to catch up on missed samples if UART was blocking
        while (tick - last_sample_tick >= sample_interval_ms) {
            last_sample_tick += sample_interval_ms;
            
            // 1. Output next sine wave value to DAC (PWM on A3)
            extern TIM_HandleTypeDef htim13;
            // Auto-scale our 0-4095 wave to whatever the timer's ARR period is set to!
            uint32_t current_arr = __HAL_TIM_GET_AUTORELOAD(&htim13);
            uint32_t pwm_val = (sine_wave[sine_index] * (current_arr + 1)) / 4096;
            __HAL_TIM_SET_COMPARE(&htim13, TIM_CHANNEL_1, pwm_val);
            
            sine_index = (sine_index + 1) % 100;
            
            // 2. Read ADC on A0 (Channel 0)
            extern ADC_HandleTypeDef hadc3;
            
            HAL_ADC_Start(&hadc3);
            if (HAL_ADC_PollForConversion(&hadc3, 1) == HAL_OK) {
                adc_buffer[sample_index] = HAL_ADC_GetValue(&hadc3);
            } else {
                adc_buffer[sample_index] = 0;
            }
            
            sample_index++;
            
            // 3. When buffer has 10 samples, send frame to ESP
            if (sample_index >= samples_per_frame) {
                SerialLink_SendStreamData(adc_buffer, samples_per_frame, NULL, 0);
                sample_index = 0;
            }
        }
    }
}