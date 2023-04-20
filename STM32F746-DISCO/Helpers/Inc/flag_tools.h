/*
 * flag_tools.h
 *
 *  Created on: Apr 4, 2023
 *      Author: Daniel Kňourek
 */

/* Define to prevent recursive inclusion -------------------------------------*/
#ifndef INC_FLAG_TOOLS_H_
#define INC_FLAG_TOOLS_H_

/* Includes ------------------------------------------------------------------*/
#include <stdint.h>

/* Exported types ------------------------------------------------------------*/
typedef struct {
	 uint8_t set;
} flag_set ;

/* Exported constants --------------------------------------------------------*/
#define FT_Flag0 ((uint8_t)1 << 0)
#define FT_Flag1 ((uint8_t)1 << 1)
#define FT_Flag2 ((uint8_t)1 << 2)
#define FT_Flag3 ((uint8_t)1 << 3)
#define FT_Flag4 ((uint8_t)1 << 4)
#define FT_Flag5 ((uint8_t)1 << 5)
#define FT_Flag6 ((uint8_t)1 << 6)
#define FT_Flag7 ((uint8_t)1 << 7)

/* Exported functions --------------------------------------------------------*/

//flag_set init_flags();
void init_flags(flag_set *flags);

void set_flag(flag_set *flags, uint8_t flag_mask);
void reset_flag(flag_set *flags, uint8_t flag_mask);

uint8_t is_set(flag_set *flags, uint8_t flag_mask);



void init_flags(flag_set *flags){
	flags->set = 0;
}

void set_flag(flag_set *flags, uint8_t flag_mask){
    flags->set = flags->set | flag_mask;
}

void reset_flag(flag_set *flags, uint8_t flag_mask){
    flags->set = flags->set & ~flag_mask;
}

uint8_t is_set(flag_set *flags, uint8_t flag_mask){
    return (flags->set & flag_mask) == flag_mask;
}


#endif /* INC_FLAG_TOOLS_H_ */
