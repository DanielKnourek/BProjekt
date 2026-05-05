#ifndef PROGRAM_MGR_H
#define PROGRAM_MGR_H

#include <stdint.h>
#include "main.h"
#include "messenger.pb.h"

void ProgramMgr_Init(void);
void ProgramMgr_Process(void);

void ProgramMgr_SetTestIntConfig(TestIntConfig *config);
void ProgramMgr_SetTestBandwidthConfig(TestBandwidthConfig *config);
void ProgramMgr_SetStreamConfig(StreamConfig *config);

#endif
