from mem0_config import memory

# 添加一条记忆
# memory.add("I'm visiting Paris", user_id="john")

# 检索全部记忆
memories = memory.get_all(user_id="john")
for mem in memories:
    print(mem)