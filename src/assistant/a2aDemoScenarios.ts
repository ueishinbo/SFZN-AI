import type { A2AConversation } from './a2aConversationTypes'

// Fictional business examples for local product demonstrations; no external systems are queried.
export const a2aDemoScenarios: A2AConversation[] = [
  {
    "id": "demo-purchase-process",
    "issue": { "id": "issue-research-tool-purchase", "title": "用户研究工具采购准备", "goal": "明确用户研究工具采购流程、材料和合同要求，为后续采购做好准备。" },
    "title": "用户研究工具采购咨询",
    "goal": "明确采购20个用户研究工具账号所需的材料和审批环节。",
    "hostUserId": "current-user",
    "hostName": "陈智超",
    "members": [
      {
        "userId": "user-wang-wu",
        "name": "王五",
        "department": "采购部",
        "color": "purple"
      }
    ],
    "perspective": "initiator",
    "scope": "direct",
    "mechanism": "collaboration",
    "speakingOrder": [
      "user-wang-wu"
    ],
    "round": 1,
    "maxRounds": 1,
    "status": "completed",
    "expectedReplyCount": 1,
    "repliedCount": 1,
    "createdAt": "10月12日 09:00",
    "updatedAt": "10月12日 09:04",
    "preview": "账号采购流程和材料清单已明确，本次咨询完成。",
    "demo": {
      "messages": [
        {
          "id": "demo-purchase-process-1",
          "conversationId": "demo-purchase-process",
          "roundId": "demo-purchase-process-round-1",
          "actorUserId": "current-user",
          "actorName": "陈智超",
          "origin": "initiator_twin",
          "content": "产品团队想采购20个用户研究工具账号，按年订阅。第一次采购这类SaaS，需要准备什么？我们先了解流程，还没有确定供应商。",
          "createdAt": "10月12日 09:00",
          "sequence": 1
        },
        {
          "id": "demo-purchase-process-2",
          "conversationId": "demo-purchase-process",
          "roundId": "demo-purchase-process-round-1",
          "actorUserId": "user-wang-wu",
          "actorName": "王五",
          "origin": "participant_twin",
          "content": "先整理使用场景、账号数量、年度报价和预算负责人。涉及上传用户访谈录音，还要提供数据存储区域、导出与删除方式，交安全和法务分别核对。采购会根据完整材料确认后续审批路径，附件是本次咨询清单。",
          "createdAt": "10月12日 09:04",
          "sequence": 2,
          "attachments": [
            {
              "id": "procurement-materials",
              "name": "用户研究工具采购材料清单.md",
              "kind": "markdown",
              "content": "# 用户研究工具采购材料清单\n\n> 虚构演示资料，不代表公司正式制度。\n\n| 材料 | 需要说明 |\n| --- | --- |\n| 采购需求 | 20个账号、使用团队、年度订阅周期 |\n| 商务资料 | 供应商报价、续费与退订方式 |\n| 预算信息 | 预算归属及负责人 |\n| 数据处理说明 | 访谈录音存储区域、权限、导出及删除方式 |\n| 待评估事项 | 安全与法务评估是否需要补充材料 |\n\n当前仅咨询，未选择供应商、签署合同或支付费用。"
            }
          ]
        }
      ],
      "replies": {},
      "roundReplies": {},
      "completionSummary": "",
      "privateMessages": [
        {
          "role": "user",
          "content": "我们想给产品团队买20个用户研究工具账号。先帮我了解采购需要什么，不用现在发起审批。"
        },
        {
          "role": "assistant",
          "content": "我会向采购同事确认需要准备的材料。除了账号数量和年度报价，这类工具可能涉及访谈录音，最好把数据怎么存、怎么删除也一起问清楚。"
        },
        {
          "role": "user",
          "content": "对，录音里可能有用户联系方式。我们还没选供应商，不要让人误以为已经定了。"
        },
        {
          "role": "assistant",
          "content": "询问时会明确“尚未选定供应商、仅咨询流程”。你的原话不会整段转发，只带上这次咨询需要的背景。"
        },
        {
          "role": "user",
          "content": "好，帮我问王五。"
        },
        {
          "role": "assistant",
          "content": "王五已说明：先准备使用需求、年度报价和预算负责人；访谈录音的数据存储、导出与删除方式还需安全和法务分别核对。采购咨询清单已放在 Workspace。"
        },
        {
          "role": "user",
          "content": "所以我们下一步先收集供应商资料，不是马上提交采购，对吧？"
        },
        {
          "role": "assistant",
          "content": "对。先把产品需求和供应商的数据处理说明收齐，再让采购确认审批路径。现在没有下单，也没有任何审批通过结论。"
        },
        {
          "role": "user",
          "content": "清楚了，这次流程咨询可以结束。"
        },
        {
          "role": "assistant",
          "content": "你已确认本次咨询完成，记录和清单保留供查看。后续选供应商和申请采购是另外的事项。"
        }
      ]
    },
    "completionSource": "host",
    "completionReason": "采购需求材料和后续咨询路径已明确，发起人确认结束本次咨询。",
    "completedAt": "2026-10-12T01:06:00Z"
  },
  {
    "id": "demo-supplier-three-rounds",
    "sourceTask": {
      "platform": "C大脑",
      "application": "C项目管理",
      "taskId": "demo-task-sms-202610",
      "titleAtReference": "完成双十一短信服务保障",
      "referencedAt": "2026-10-12 09:00"
    },
    "title": "短信服务续约与大促容量确认",
    "goal": "核对大促短信额度、扩容时间和备选方案，明确跟进分工。",
    "hostUserId": "current-user",
    "hostName": "陈智超",
    "members": [
      {
        "userId": "user-wang-wu",
        "name": "王五",
        "department": "采购部",
        "color": "purple"
      },
      {
        "userId": "user-li-si",
        "name": "李四",
        "department": "运营部",
        "color": "green"
      }
    ],
    "perspective": "initiator",
    "scope": "group",
    "mechanism": "collaboration",
    "speakingOrder": [
      "user-wang-wu",
      "user-li-si"
    ],
    "round": 3,
    "maxRounds": 3,
    "status": "response_received",
    "expectedReplyCount": 2,
    "repliedCount": 2,
    "createdAt": "10月12日 09:00",
    "updatedAt": "10月12日 09:21",
    "preview": "三轮沟通结束：扩容和商务条件仍待书面确认，等待发起人继续。",
    "demo": {
      "messages": [
        {
          "id": "demo-supplier-three-rounds-1",
          "conversationId": "demo-supplier-three-rounds",
          "roundId": "demo-supplier-three-rounds-round-1",
          "actorUserId": "current-user",
          "actorName": "陈智超",
          "origin": "initiator_twin",
          "content": "10月20日活动预计发送120万条短信，当前套餐月额度100万条。请采购和运营一起核对剩余额度、扩容时间，以及未及时扩容时怎么办。",
          "createdAt": "10月12日 09:00",
          "sequence": 1
        },
        {
          "id": "demo-supplier-three-rounds-2",
          "conversationId": "demo-supplier-three-rounds",
          "roundId": "demo-supplier-three-rounds-round-1",
          "actorUserId": "user-wang-wu",
          "actorName": "王五",
          "origin": "participant_twin",
          "content": "服务商后台导出的演示账单显示，本月还剩70万条。客户经理口头说可以加购，但还没给含税报价和生效时间。",
          "createdAt": "10月12日 09:03",
          "sequence": 2
        },
        {
          "id": "demo-supplier-three-rounds-3",
          "conversationId": "demo-supplier-three-rounds",
          "roundId": "demo-supplier-three-rounds-round-1",
          "actorUserId": "user-li-si",
          "actorName": "李四",
          "origin": "participant_twin",
          "content": "120万条是活动总量预测，其中20万条是验证码和订单通知，100万条是营销触达。我们需要先保证交易类通知，不能只看套餐总额度。",
          "createdAt": "10月12日 09:05",
          "sequence": 3
        },
        {
          "id": "demo-supplier-three-rounds-4",
          "conversationId": "demo-supplier-three-rounds",
          "roundId": "demo-supplier-three-rounds-round-2",
          "actorUserId": "current-user",
          "actorName": "陈智超",
          "origin": "initiator_twin",
          "content": "下一轮，请核对不同类型短信的容量限制，以及备选触达方案。",
          "createdAt": "10月12日 09:08",
          "sequence": 4
        },
        {
          "id": "demo-supplier-three-rounds-5",
          "conversationId": "demo-supplier-three-rounds",
          "roundId": "demo-supplier-three-rounds-round-2",
          "actorUserId": "user-wang-wu",
          "actorName": "王五",
          "origin": "participant_twin",
          "content": "服务商表示交易类与营销类使用不同通道。加购条数不一定同时提高每秒发送量，我已要求把两类通道的容量和生效条件写进方案。",
          "createdAt": "10月12日 09:11",
          "sequence": 5
        },
        {
          "id": "demo-supplier-three-rounds-6",
          "conversationId": "demo-supplier-three-rounds",
          "roundId": "demo-supplier-three-rounds-round-2",
          "actorUserId": "user-li-si",
          "actorName": "李四",
          "origin": "participant_twin",
          "content": "运营可以降低营销发送峰值，并用站内信补充触达，但验证码不能用站内信替代。需要研发核对交易通道峰值，这次不直接修改发送策略。",
          "createdAt": "10月12日 09:13",
          "sequence": 6
        },
        {
          "id": "demo-supplier-three-rounds-7",
          "conversationId": "demo-supplier-three-rounds",
          "roundId": "demo-supplier-three-rounds-round-3",
          "actorUserId": "current-user",
          "actorName": "陈智超",
          "origin": "initiator_twin",
          "content": "第三轮，请明确谁补什么资料、什么时候再次核对，先不要下单或调整线上策略。",
          "createdAt": "10月12日 09:16",
          "sequence": 7
        },
        {
          "id": "demo-supplier-three-rounds-8",
          "conversationId": "demo-supplier-three-rounds",
          "roundId": "demo-supplier-three-rounds-round-3",
          "actorUserId": "user-wang-wu",
          "actorName": "王五",
          "origin": "participant_twin",
          "content": "我今天16:00前向服务商索取正式报价、分通道容量和生效时间。书面回复没到之前，不承诺扩容已落实。",
          "createdAt": "10月12日 09:19",
          "sequence": 8
        },
        {
          "id": "demo-supplier-three-rounds-9",
          "conversationId": "demo-supplier-three-rounds",
          "roundId": "demo-supplier-three-rounds-round-3",
          "actorUserId": "user-li-si",
          "actorName": "李四",
          "origin": "participant_twin",
          "content": "我明天10:00前补齐分时段发送预测，并找研发复核交易类峰值。已把本次跟进事项整理成附件，活动排期暂未变更。",
          "createdAt": "10月12日 09:21",
          "sequence": 9,
          "attachments": [
            {
              "id": "delivery-followup",
              "name": "大促短信容量跟进清单.md",
              "kind": "markdown",
              "content": "# 大促短信容量跟进清单\n\n> 虚构演示资料。活动日期：10月20日。\n\n活动预计120万条：交易类20万条、营销类100万条。当前剩余额度70万条，预计总量缺口50万条；分通道吞吐量尚待核实。\n\n| 待确认事项 | 负责人 | 跟进时间 |\n| --- | --- | --- |\n| 含税报价、分通道容量、生效时间 | 王五（采购） | 10月12日16:00 |\n| 分时段发送预测、研发峰值复核 | 李四（运营） | 10月13日10:00 |\n| 营销降峰与站内信备选方案 | 李四（运营） | 随预测一起提供 |\n\n加购额度不等于提升吞吐量；验证码不能直接用站内信替代。未下单、付款或修改线上配置。"
            }
          ]
        }
      ],
      "replies": {},
      "roundReplies": {
        "4": {
          "user-wang-wu": "暂未收到正式报价与生效时间，仍不能确认扩容一定赶上活动。",
          "user-li-si": "分时段预测仍在核对，交易通道峰值需要研发确认，暂不把备选方案视为已经执行。"
        }
      },
      "completionSummary": "",
      "privateMessages": [
        {
          "role": "user",
          "content": "大促还有一周，我最担心短信额度不够。先帮我把采购和运营的信息对齐，别直接加购。"
        },
        {
          "role": "assistant",
          "content": "我会先问清剩余额度和预计发送量，再核对生效时间。条数够不够、峰值能不能扛住是两个问题，需要分开看。"
        },
        {
          "role": "user",
          "content": "验证码和订单通知要优先保证，营销短信可以讨论降峰。这个优先级带给他们。"
        },
        {
          "role": "assistant",
          "content": "第一轮两位同事已反馈：剩余70万条，活动预测120万条，其中交易类20万条、营销类100万条。按当前预测，总量缺口是50万条。"
        },
        {
          "role": "user",
          "content": "买50万条就能解决吗？我不想采购完才发现还是发不出去。"
        },
        {
          "role": "assistant",
          "content": "还不能这么判断。第二轮确认了交易与营销使用不同通道，加购条数不一定提高每秒发送量；服务商的生效时间也只有口头说法。站内信只能补充部分营销触达，不能替代验证码。"
        },
        {
          "role": "user",
          "content": "那这轮先收敛到谁跟进什么，不要写成风险已关闭。"
        },
        {
          "role": "assistant",
          "content": "第三轮已明确：王五今天16:00前追正式报价、分通道容量和生效时间；李四明天10:00前补分时段预测，并请研发复核交易峰值。跟进清单已在 Workspace。"
        },
        {
          "role": "assistant",
          "content": "本轮沟通已到预设的3轮，书面方案和峰值复核仍未到齐。你可以继续询问，比如说“下一轮，请确认是否收到短信扩容的书面方案”。"
        }
      ],
      "roundSummaries": {
        "3": "额度缺口和通道峰值需分别核对；采购追书面方案，运营补发送预测。"
      }
    }
  },
  {
    "id": "demo-review-interactive",
    "sourceTask": {
      "platform": "C大脑",
      "application": "C项目管理",
      "taskId": "demo-task-pet-202610",
      "titleAtReference": "完成数字宠物首期需求方案",
      "referencedAt": "2026-10-12 09:00"
    },
    "title": "桌面数字宠物首期需求评审",
    "goal": "明确智能体客户端桌面宠物的首期交互、状态反馈与免打扰规则。",
    "hostUserId": "current-user",
    "hostName": "陈智超",
    "members": [
      {
        "userId": "user-chen-gong",
        "name": "陈工",
        "department": "测试团队",
        "color": "orange"
      },
      {
        "userId": "user-liu-gong",
        "name": "刘工",
        "department": "研发团队",
        "color": "blue"
      }
    ],
    "perspective": "initiator",
    "scope": "group",
    "mechanism": "collaboration",
    "speakingOrder": [
      "user-chen-gong",
      "user-liu-gong"
    ],
    "round": 1,
    "maxRounds": 3,
    "status": "waiting_user_confirmation",
    "expectedReplyCount": 2,
    "repliedCount": 2,
    "createdAt": "10月12日 10:00",
    "updatedAt": "10月12日 10:05",
    "preview": "首轮发现桌面展示和任务提醒边界未明确，待你决定下一轮范围。",
    "demo": {
      "messages": [
        {
          "id": "demo-review-interactive-1",
          "conversationId": "demo-review-interactive",
          "roundId": "demo-review-interactive-round-1",
          "actorUserId": "current-user",
          "actorName": "陈智超",
          "origin": "initiator_twin",
          "content": "智能体客户端想增加一个桌面数字宠物：用户能看到它、拖动它，点一下回到助理，还能感知任务状态。请测试和研发先指出范围不明确的地方，先不承诺上线日期。",
          "createdAt": "10月12日 10:00",
          "sequence": 1
        },
        {
          "id": "demo-review-interactive-2",
          "conversationId": "demo-review-interactive",
          "roundId": "demo-review-interactive-round-1",
          "actorUserId": "user-chen-gong",
          "actorName": "陈工",
          "origin": "participant_twin",
          "content": "需要先明确宠物是否始终置顶、全屏时是否隐藏、关闭后如何找回。另外多个任务同时运行时展示哪个状态，任务失败和需要用户确认要怎么区分？",
          "createdAt": "10月12日 10:03",
          "sequence": 2
        },
        {
          "id": "demo-review-interactive-3",
          "conversationId": "demo-review-interactive",
          "roundId": "demo-review-interactive-round-1",
          "actorUserId": "user-liu-gong",
          "actorName": "刘工",
          "origin": "participant_twin",
          "content": "悬浮展示、拖动和点击唤起可以先评估。但主动弹气泡、声音提醒和跨应用行为需要更多约束，不能让宠物抢键盘焦点或挡住用户正在操作的内容。",
          "createdAt": "10月12日 10:05",
          "sequence": 3
        }
      ],
      "replies": {},
      "roundReplies": {
        "2": {
          "user-chen-gong": "按“陪伴展示、点击唤起、无声状态反馈”的方向，建议区分待机、处理中、待你确认、失败。多任务并行时优先待确认，其次失败、处理中、待机；具体优先级仍需产品确认。",
          "user-liu-gong": "可以继续评估拖动、记住位置和收起入口。建议全屏时隐藏，恢复后回到可见区域；不主动抢焦点、不读取其他应用内容，暂不做自主聊天和声音。"
        },
        "3": {
          "user-chen-gong": "测试侧整理拖动越界、多屏切换、全屏隐藏、收起恢复及多任务状态切换用例。状态优先级和提醒是否重复仍标为待产品确认。",
          "user-liu-gong": "研发侧拆分桌面悬浮层、客户端唤起、任务状态映射和显示偏好。设计还需提供待机、处理中、待确认、失败的表现资源；资源和规则齐备后再评估排期。"
        }
      },
      "completionSummary": "",
      "privateMessages": [
        {
          "role": "user",
          "content": "我想让智能体客户端有个桌面数字宠物，不只是一个启动图标，要让人感觉助理就在旁边。先找测试和研发聊聊首期怎么做。"
        },
        {
          "role": "assistant",
          "content": "可以先围绕三件事讨论：宠物怎么留在桌面上、点击后到哪里、怎样表达任务状态。陪伴感可以通过动作和表情体现，不一定要主动弹消息。"
        },
        {
          "role": "user",
          "content": "对，可以拖动，点它回到助理。我不想它在开会或做别的事时一直跳出来。"
        },
        {
          "role": "assistant",
          "content": "已发起首轮讨论。陈工提出全屏隐藏、关闭恢复和多任务状态优先级；刘工提醒悬浮层不能抢焦点，气泡与声音需要明确约束。现在还不能把“有个宠物”当成范围已经确定。"
        },
        {
          "role": "user",
          "content": "那你建议第一期保留什么？"
        },
        {
          "role": "assistant",
          "content": "建议先保留桌面展示、拖动、点击唤起助理，以及待机、处理中、待你确认、失败四类无声反馈。主动聊天、声音和跨应用感知先不纳入；全屏隐藏与收起恢复还要继续核对。"
        },
        {
          "role": "assistant",
          "content": "这是下一轮的建议，不是已经定稿。请在下方选择是否按“轻量陪伴、不主动打扰”继续讨论。"
        }
      ],
      "roundSummaries": {
        "1": "置顶、免打扰与多任务状态规则未定，暂不能直接评估整期范围。",
        "2": "讨论方向为展示、拖动、点击唤起和无声状态反馈；状态优先级仍待确认。",
        "3": "测试补边界用例，研发拆模块；状态规则和美术资源尚未齐备，未承诺上线日期。"
      }
    },
    "pendingCurrentUserConfirmation": {
      "id": "demo-review-ask",
      "question": "下一轮先按“轻量陪伴、不主动打扰”核对首期范围？",
      "description": "只确定继续讨论的方向，状态优先级、设计资源和排期仍需确认。",
      "resumeStatus": "response_received",
      "resumePreview": "首轮桌面交互问题已收齐，等待发起人继续。",
      "choices": [
        {
          "id": "versions",
          "label": "先按轻量陪伴方案讨论",
          "description": "保留拖动、点击唤起和无声状态反馈，暂不做自主聊天或声音提醒。",
          "commandAction": "send",
          "commandContent": "下一轮，先按轻量陪伴方案讨论：桌面展示、拖动、点击唤起助理和无声状态反馈，不主动聊天或播放声音。请补充边界与验收条件。"
        },
        {
          "id": "hold",
          "label": "先不继续",
          "description": "保留已收到的意见，不向任何人发送新消息。"
        }
      ]
    }
  },
  {
    "id": "demo-pet-test-followup",
    "title": "数字宠物测试进度跟进",
    "sourceTask": {
      "platform": "C大脑",
      "application": "C项目管理",
      "taskId": "demo-task-pet-202610",
      "titleAtReference": "完成数字宠物首期需求方案",
      "referencedAt": "2026-10-13 09:00"
    },
    "goal": "核实数字宠物尚未开展测试的原因，明确启动条件与下一次反馈时间。",
    "hostUserId": "current-user",
    "hostName": "陈智超",
    "members": [
      {
        "userId": "user-chen-gong",
        "name": "陈工",
        "department": "测试团队",
        "color": "green"
      }
    ],
    "perspective": "initiator",
    "scope": "direct",
    "mechanism": "collaboration",
    "speakingOrder": [
      "user-chen-gong"
    ],
    "round": 2,
    "maxRounds": 2,
    "status": "response_received",
    "expectedReplyCount": 1,
    "repliedCount": 1,
    "createdAt": "10月13日 09:00",
    "updatedAt": "10月13日 09:12",
    "preview": "测试尚未启动，待测版本与变更清单未齐；陈工16:00反馈材料齐备情况与测试安排。",
    "demo": {
      "messages": [
        {
          "id": "demo-pet-test-followup-1",
          "conversationId": "demo-pet-test-followup",
          "roundId": "demo-pet-test-followup-round-1",
          "actorName": "陈智超",
          "actorUserId": "current-user",
          "origin": "initiator_twin",
          "content": "数字宠物首期需求还在评审，客户端已有一版内部体验包。我还没看到测试反馈，想单独确认一下：目前是否已开始验证？如果没开始，是包、环境还是验收口径卡住？这次先核实原因和安排，不催你跳过前置条件。",
          "createdAt": "10月13日 09:00",
          "sequence": 1
        },
        {
          "id": "demo-pet-test-followup-2",
          "conversationId": "demo-pet-test-followup",
          "roundId": "demo-pet-test-followup-round-1",
          "actorName": "陈工",
          "actorUserId": "user-chen-gong",
          "origin": "participant_twin",
          "content": "还没开始验证。我收到的是上周体验包，未拿到这次待测版本和变更清单；多任务状态优先级也没有定。拖动、点击唤起可以先做冒烟，但需要先确认包版本和测试环境。暂时不能给完整测试完成时间。",
          "createdAt": "10月13日 09:04",
          "sequence": 2
        },
        {
          "id": "demo-pet-test-followup-3",
          "conversationId": "demo-pet-test-followup",
          "roundId": "demo-pet-test-followup-round-2",
          "actorName": "陈智超",
          "actorUserId": "current-user",
          "origin": "initiator_twin",
          "content": "先把能测和不能测的部分分开。请列出启动冒烟的必要材料和下一次反馈时间；状态优先级继续在需求评审会话里确认，这里不默认它已经定稿，也不要求直接开测。",
          "createdAt": "10月13日 09:08",
          "sequence": 3
        },
        {
          "id": "demo-pet-test-followup-4",
          "conversationId": "demo-pet-test-followup",
          "roundId": "demo-pet-test-followup-round-2",
          "actorName": "陈工",
          "actorUserId": "user-chen-gong",
          "origin": "participant_twin",
          "content": "启动冒烟还需要待测包版本、安装入口和本次变更清单。拿到后我会先确认环境和基本唤起路径；状态优先级相关用例暂不判通过。今天16:00我先反馈材料是否齐备及可安排的测试时间，不把这个时间当作测试完成承诺。",
          "createdAt": "10月13日 09:12",
          "sequence": 4
        }
      ],
      "replies": {
        "user-chen-gong": "目前还没有新的材料齐备记录，不能确认已开始测试。仍按16:00反馈材料情况和安排；如要确认最新进展，需要核对实际待测版本与环境。"
      },
      "roundReplies": {},
      "roundSummaries": {
        "2": "测试尚未启动，待测版本、安装入口和变更清单仍待齐备。陈工16:00反馈材料情况及测试安排，未承诺测试完成。"
      },
      "completionSummary": "本次测试进度询问结束；不代表测试通过、需求评审完成或平台任务完工。",
      "privateMessages": [
        {
          "role": "user",
          "content": "数字宠物这个任务怎么还没看到测试反馈？不用把研发都拉进来，单独帮我问陈工卡在哪里。"
        },
        {
          "role": "assistant",
          "content": "已针对测试进度另开会话，只有你和陈工，引用的仍是“完成数字宠物首期需求方案”。原来的多人会话继续讨论需求边界，这里只核实测试阻塞与安排。"
        },
        {
          "role": "user",
          "content": "先问清楚，别直接承诺今天能测完。需求评审还没定的规则也别当作已经定了。"
        },
        {
          "role": "assistant",
          "content": "陈工首轮反馈尚未开始验证：待测版本和变更清单没有齐备，状态优先级也未确定。可以先讨论基础冒烟的启动条件，完整验收暂时无法承诺。"
        },
        {
          "role": "user",
          "content": "那请他把启动条件列出来，今天给我一个反馈时间。待测包我会另找研发核对，这里不用加人。"
        },
        {
          "role": "assistant",
          "content": "第二轮已明确：待测包版本、安装入口和变更清单需要先齐备。陈工今天16:00反馈材料情况与可安排的测试时间；这是进度反馈时间，不是测试完成时间。"
        },
        {
          "role": "user",
          "content": "先保留待跟进，别把原任务或者评审群标成完成。"
        },
        {
          "role": "assistant",
          "content": "这两个协同会话各自保留当前进展，没有修改原平台任务，也没有向评审会话发送消息。已完成2轮沟通，后续要继续询问时，你可以说“下一轮，请确认待测材料是否齐备”。"
        }
      ]
    }
  },
  {
    "id": "demo-targeted-reply",
    "issue": { "id": "issue-research-tool-purchase", "title": "用户研究工具采购准备", "goal": "明确用户研究工具采购流程、材料和合同要求，为后续采购做好准备。" },
    "title": "数据服务合同条款澄清",
    "goal": "明确用户研究工具合同中的数据删除、分包与续费条款。",
    "hostUserId": "current-user",
    "hostName": "陈智超",
    "members": [
      {
        "userId": "user-zhou-ning",
        "name": "周宁",
        "department": "法务部",
        "color": "orange"
      },
      {
        "userId": "user-xu-chen",
        "name": "许晨",
        "department": "信息安全部",
        "color": "blue"
      }
    ],
    "perspective": "initiator",
    "scope": "group",
    "mechanism": "collaboration",
    "speakingOrder": [
      "user-zhou-ning",
      "user-xu-chen"
    ],
    "round": 1,
    "maxRounds": 2,
    "status": "response_received",
    "expectedReplyCount": 1,
    "repliedCount": 1,
    "createdAt": "10月12日 11:00",
    "updatedAt": "10月12日 11:04",
    "preview": "法务首轮意见已收到；可继续向法务或安全补问。",
    "demo": {
      "messages": [
        {
          "id": "demo-contract-opening",
          "conversationId": "demo-targeted-reply",
          "roundId": "demo-targeted-reply-round-1",
          "actorUserId": "current-user",
          "actorName": "陈智超",
          "origin": "initiator_twin",
          "content": "@周宁 我们正在评估用户研究工具合同，尚未决定采购。请核对终止后的数据删除时限与证明，以及自动续费提醒和取消约定，指出需要补充的条款。",
          "createdAt": "10月12日 11:00",
          "sequence": 1
        },
        {
          "id": "demo-contract-legal",
          "conversationId": "demo-targeted-reply",
          "roundId": "demo-targeted-reply-round-1",
          "actorUserId": "user-zhou-ning",
          "actorName": "周宁",
          "origin": "participant_twin",
          "content": "草案只写合同终止后“合理期限内”删除数据，缺少明确时限和删除证明；自动续费也没有提醒期限。建议先让供应商补充条款，不能据此认定合同已经通过审核。",
          "createdAt": "10月12日 11:04",
          "sequence": 2
        }
      ],
      "replies": {},
      "roundReplies": {
        "1": {
          "user-zhou-ning": "草案只写合同终止后“合理期限内”删除数据，缺少明确时限和删除证明；自动续费也没有提醒期限。建议先让供应商补充条款，不能据此认定合同已经通过审核。",
          "user-xu-chen": "附件未列明实际存储区域与分包商名单，现有安全说明无法覆盖这两项。需要供应商补充材料后再评估。"
        },
        "2": {
          "user-zhou-ning": "法务会整理删除时限、删除证明和续费提醒的修改意见，待供应商反馈后复核，本次没有批准签署。",
          "user-xu-chen": "安全侧会列出存储区域、分包商与访问权限的补充问题，在资料齐全前不出具通过结论。"
        }
      },
      "completionSummary": "",
      "privateMessages": [
        {
          "role": "assistant",
          "content": "你在我的助理中确认创建协作后，我已向周宁发出了合同条款询问，许晨也在群里。本轮只指定法务回复，首条消息可以在右侧查看。"
        },
        {
          "role": "assistant",
          "content": "周宁已回复：删除期限只写“合理期限”，缺少明确时限和删除证明，自动续费也没有提醒期限。建议补充条款，尚不能认定审核通过。"
        },
        {
          "role": "user",
          "content": "那我们现在能先推进采购吗？"
        },
        {
          "role": "assistant",
          "content": "目前只是收到了法务的初步意见，没有签署批准或安全评估结论。可以整理需补材料，但不宜把这些疑问视为已经解决。"
        },
        {
          "role": "user",
          "content": "我主要担心停用以后访谈录音还留在对方那里。安全那边还得问什么？"
        },
        {
          "role": "assistant",
          "content": "建议继续问实际存储区域、分包商名单和访问权限。刚才的首轮只请了周宁回答，许晨还没有就这些问题发表意见。"
        },
        {
          "role": "user",
          "content": "帮我把下一轮问题写得客观一点，先别发。"
        },
        {
          "role": "assistant",
          "content": "补问草稿：“请核对工具的数据存储区域、分包商名单与访问权限，并列出仍需供应商补充的材料。”\n这条补问还未发送。若只问安全，可输入“下一轮，@许晨 请回复数据存储与分包商需要补充的材料”；不指定@则两位同事都回复。"
        }
      ],
      "roundSummaries": {
        "2": "法务整理合同修改意见，安全补充数据处理问题；尚未通过审核或签署。"
      }
    }
  },
  {
    "id": "demo-member-confirm",
    "title": "总部周例会材料确认",
    "goal": "确认总部周例会所需项目进展、风险事项和采购情况材料的口径与提交时间。",
    "hostUserId": "user-li-si",
    "hostName": "李四",
    "members": [
      {
        "userId": "current-user",
        "name": "陈智超",
        "department": "产品部",
        "color": "blue"
      },
      {
        "userId": "user-wang-wu",
        "name": "王五",
        "department": "采购部",
        "color": "purple"
      }
    ],
    "perspective": "recipient",
    "scope": "group",
    "mechanism": "collaboration",
    "speakingOrder": [
      "current-user",
      "user-wang-wu"
    ],
    "round": 1,
    "maxRounds": 2,
    "status": "waiting_user_confirmation",
    "expectedReplyCount": 2,
    "repliedCount": 1,
    "createdAt": "10月12日 10:20",
    "updatedAt": "10月12日 10:23",
    "preview": "李四正在等你确认：项目进展材料能否周二17:00前提供？",
    "demo": {
      "messages": [
        {
          "id": "demo-member-confirm-1",
          "conversationId": "demo-member-confirm",
          "roundId": "demo-member-confirm-round-1",
          "actorUserId": "user-li-si",
          "actorName": "李四",
          "origin": "initiator_twin",
          "content": "总部周三上午召开周例会，请陈智超提供项目进展与风险事项，王五提供重点采购进度。能否周二17:00前给到汇总版本？未确认的数据请单独标注。",
          "createdAt": "10月12日 10:20",
          "sequence": 1
        },
        {
          "id": "demo-member-confirm-2",
          "conversationId": "demo-member-confirm",
          "roundId": "demo-member-confirm-round-1",
          "actorUserId": "user-wang-wu",
          "actorName": "王五",
          "origin": "participant_twin",
          "content": "采购进度表已整理，两个项目的供应商交期还在核实。我可以先提供标注“待确认”的版本，不会把口头交期写成已确认。",
          "createdAt": "10月12日 10:23",
          "sequence": 2
        }
      ],
      "replies": {},
      "roundReplies": {},
      "completionSummary": "",
      "privateMessages": [
        {
          "role": "assistant",
          "content": "李四正在汇总总部周三例会材料，询问你能否周二17:00前提交项目进展和风险事项。王五已表示采购材料可以先给标注待确认的版本。"
        },
        {
          "role": "user",
          "content": "进展部分差不多了，但有两项里程碑的口径还要问负责人。不要把上周的数字直接当本周结论。"
        },
        {
          "role": "assistant",
          "content": "明白。目前有草稿，但里程碑口径尚未核实。我不会替你承诺最终版已就绪，也不会自动上传材料。"
        },
        {
          "role": "user",
          "content": "我希望先给能确认的部分，未确认的就标出来。但时间我还要再看一下。"
        },
        {
          "role": "assistant",
          "content": "可以先回复提交时间尚需核实；如果你能明确保证周二17:00前提供带待确认标记的汇总版本，也可以按这个口径回复，避免被理解为所有数据已核定。"
        },
        {
          "role": "assistant",
          "content": "请在下方决定本次回复内容。你是这次材料协作的成员，李四负责后续汇总和推进。"
        }
      ]
    },
    "pendingCurrentUserConfirmation": {
      "id": "demo-member-ask",
      "question": "如何回复李四关于总部周例会材料提交时间的询问？",
      "description": "只确认本次沟通的回复，不自动上传材料或代为提交汇报。",
      "resumeStatus": "waiting_replies",
      "resumePreview": "等待本人明确回复内容。",
      "choices": [
        {
          "id": "verify",
          "label": "回复尚需核实",
          "description": "明确时间未定，不作交期承诺。",
          "commandAction": "send",
          "commandContent": "@李四 项目进展和风险材料还需核实，暂不能确认周二17:00前提供汇总版本，核实后再回复。"
        },
        {
          "id": "confirmed",
          "label": "确认可以周二提供",
          "description": "由本人明确承诺后，分身按原意发送。",
          "commandAction": "send",
          "commandContent": "@李四 我确认周二17:00前提供总部周例会项目进展和风险汇总版本，未确认数据会单独标注。"
        },
        {
          "id": "cancel",
          "label": "暂不发送",
          "description": "保留问题背景，先私下讨论。"
        }
      ]
    }
  },
  {
    "id": "demo-member-notice",
    "title": "产品增长周会调整通知",
    "goal": "同步周三产品增长周会的会议室和议程。",
    "hostUserId": "user-liu-gong",
    "hostName": "刘工",
    "members": [
      {
        "userId": "current-user",
        "name": "陈智超",
        "department": "产品部",
        "color": "blue"
      },
      {
        "userId": "user-chen-gong",
        "name": "陈工",
        "department": "测试团队",
        "color": "orange"
      }
    ],
    "perspective": "recipient",
    "scope": "group",
    "mechanism": "notice",
    "speakingOrder": [],
    "round": 1,
    "maxRounds": 1,
    "status": "delivered",
    "expectedReplyCount": 0,
    "repliedCount": 0,
    "createdAt": "10月12日 11:30",
    "updatedAt": "10月12日 11:30",
    "preview": "刘工通知：周三14:00改到星云会议室，议题不变。",
    "demo": {
      "messages": [
        {
          "id": "demo-member-notice-1",
          "conversationId": "demo-member-notice",
          "roundId": "demo-member-notice-round-1",
          "actorUserId": "user-liu-gong",
          "actorName": "刘工",
          "origin": "initiator_twin",
          "content": "周三14:00产品增长周会改到星云会议室，时间不变。主要看注册转化漏斗、会员活动准备和实验排期，详见附件；无需逐人回复。",
          "createdAt": "10月12日 11:30",
          "sequence": 1,
          "attachments": [
            {
              "id": "meeting-agenda",
              "name": "产品增长周会议程.md",
              "kind": "markdown",
              "content": "# 产品增长周会议程\n\n> 虚构演示资料。\n\n时间：10月14日14:00—15:00\n地点：星云会议室\n\n1. 注册漏斗：核对各渠道转化口径\n2. 会员活动：同步素材和联调准备\n3. 增长实验：讨论优先级与评估指标\n\n只调整会议地点，不自动变更日历或项目排期。"
            }
          ]
        }
      ],
      "replies": {},
      "roundReplies": {},
      "completionSummary": "",
      "privateMessages": [
        {
          "role": "assistant",
          "content": "刘工通知：周三14:00产品增长周会改到星云会议室，时间和议题没变，且不要求逐人回复。"
        },
        {
          "role": "user",
          "content": "我需要重新准备材料吗？"
        },
        {
          "role": "assistant",
          "content": "这条通知没有新增材料要求。附件议程仍是注册转化漏斗、会员活动准备和增长实验优先级，你可以在 Workspace 查看。"
        },
        {
          "role": "user",
          "content": "那就不用替我回复收到了，也先别改日历。"
        },
        {
          "role": "assistant",
          "content": "好的，没有发送回执，也没有修改日历。地点变更保留在当前通知里，开会前可以回来查看。"
        }
      ]
    }
  }
]
