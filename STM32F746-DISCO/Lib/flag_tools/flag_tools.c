/*
 * flag_tools.c
 *
 *  Created on: Apr 4, 2023
 *      Author: Daniel Kňourek
 */

#include "flag_tools.h"

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

