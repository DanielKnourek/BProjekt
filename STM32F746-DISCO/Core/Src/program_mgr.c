#include "program_mgr.h"
#include "serial_link.h"

static TestIntConfig test_int_config = TestIntConfig_init_zero;
static TestBandwidthConfig test_bandwidth_config = TestBandwidthConfig_init_zero;
static StreamConfig stream_config = StreamConfig_init_zero;

// Timing variables
static uint32_t last_test_int_tick = 0;
static uint32_t last_bandwidth_tick = 0;
static uint32_t last_stream_tick = 0;
static uint32_t stream_sample_index = 0;

static int32_t test_int_counter = 0;

// Program 3 DAC FIFO
#define DAC_FIFO_SIZE 8192
static int32_t dac_fifo[DAC_FIFO_SIZE];
static uint16_t dac_fifo_write = 0;
static uint16_t dac_fifo_read = 0;

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

    extern TIM_HandleTypeDef htim13;
    extern ADC_HandleTypeDef hadc3;
    
    if (stream_config.enable) {
        // Reset FIFO and state to ensure clean start
        dac_fifo_read = 0;
        dac_fifo_write = 0;
        last_stream_tick = HAL_GetTick(); // Start fresh
        stream_sample_index = 0;
        
        HAL_TIM_PWM_Start(&htim13, TIM_CHANNEL_1);
        HAL_ADC_Start(&hadc3);
    } else {
        HAL_TIM_PWM_Stop(&htim13, TIM_CHANNEL_1);
        HAL_ADC_Stop(&hadc3);
    }

    HAL_GPIO_WritePin(ARDUINO_PWM_CS_D5_GPIO_Port, ARDUINO_PWM_CS_D5_Pin, 
        stream_config.enable ? GPIO_PIN_SET : GPIO_PIN_RESET);
}

void ProgramMgr_HandleTestBandwidthData(TestBandwidthData *data) {
    // Echo back the received data
    SerialLink_SendTestBandwidthData(data->dummy_data.bytes, data->dummy_data.size);
}

void ProgramMgr_HandleStreamData(StreamData *data) {
    for (uint32_t i = 0; i < data->dac_values_count; i++) {
        dac_fifo[dac_fifo_write] = data->dac_values[i];
        dac_fifo_write = (dac_fifo_write + 1) % DAC_FIFO_SIZE;
        
        // Basic overflow protection: if we catch up to read index, skip oldest sample
        if (dac_fifo_write == dac_fifo_read) {
            dac_fifo_read = (dac_fifo_read + 1) % DAC_FIFO_SIZE;
        }
    }
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
    /* Periodic generation disabled - STM now acts as a transparent echo for Program 2
    if (test_bandwidth_config.enable && (tick - last_bandwidth_tick >= 10)) {
        last_bandwidth_tick = tick;
        
        uint32_t size = test_bandwidth_config.has_payload_size ? test_bandwidth_config.payload_size : 1024;
        if (size > 1024) size = 1024; // cap to max array size
        
        uint8_t dummy[1024]; // allocate dummy buffer
        // For bandwidth test, filling pattern isn't strictly necessary, but we can do a quick memset
        memset(dummy, 0xAB, size);
        
        SerialLink_SendTestBandwidthData(dummy, size);
    }
    */

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
        // Extract config values (with defaults if not provided)
        uint32_t samples_per_frame = stream_config.has_samples_per_frame ? stream_config.samples_per_frame : 10;
        if (samples_per_frame > 1000) samples_per_frame = 1000;
        uint32_t sample_rate_hz = stream_config.has_sample_rate_hz ? stream_config.sample_rate_hz : 500;
        uint32_t sample_interval_ms = (sample_rate_hz > 0) ? (1000 / sample_rate_hz) : 10;
        
        static int32_t adc_buffer[1000]; // Max size matching protobuf definition
        
        // Initialize tick on first run
        if (last_stream_tick == 0) last_stream_tick = tick;
        
        if (tick - last_stream_tick >= sample_interval_ms) {
            if (tick - last_stream_tick > sample_interval_ms * 2) {
                last_stream_tick = tick;
            } else {
                last_stream_tick += sample_interval_ms;
            }
            
            // 1. Output next value from FIFO to DAC (PWM on A3)
            static int32_t dac_val = 2048;
            if (dac_fifo_read != dac_fifo_write) {
                dac_val = dac_fifo[dac_fifo_read];
                dac_fifo_read = (dac_fifo_read + 1) % DAC_FIFO_SIZE;
            }

            extern TIM_HandleTypeDef htim13;
            uint32_t current_arr = __HAL_TIM_GET_AUTORELOAD(&htim13);
            uint32_t pwm_val = (dac_val * (current_arr + 1)) / 4096;
            if (pwm_val > current_arr) pwm_val = current_arr;
            __HAL_TIM_SET_COMPARE(&htim13, TIM_CHANNEL_1, pwm_val);
            
            // 2. Read ADC on A0 (Channel 0) - Robust Single Trigger
            extern ADC_HandleTypeDef hadc3;
            static uint32_t current_adc_reading = 2048;
            HAL_ADC_Start(&hadc3);
            if (HAL_ADC_PollForConversion(&hadc3, 10) == HAL_OK) {
                current_adc_reading = HAL_ADC_GetValue(&hadc3);
            }
            HAL_ADC_Stop(&hadc3);
            
            adc_buffer[stream_sample_index] = current_adc_reading;
            
            stream_sample_index++;
            
            // 3. When buffer has enough samples, send frame to ESP
            if (stream_sample_index >= samples_per_frame) {
                SerialLink_SendStreamData(adc_buffer, samples_per_frame, NULL, 0);
                stream_sample_index = 0;
            }
        }
    }
}