/*
 * flag_tools.c
 *
 *  Created on: Apr 4, 2023
 *      Author: Daniel Kňourek
 */

/* Includes ------------------------------------------------------------------*/
#include "flag_tools.h"

/* Exported types ------------------------------------------------------------*/

/* Exported constants --------------------------------------------------------*/

/* Exported functions --------------------------------------------------------*/
//flag_set init_flags(){
//    flag_set flags;
//    flags.set = (uint8_t)1 << 4;
//    return flags;
//}
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
