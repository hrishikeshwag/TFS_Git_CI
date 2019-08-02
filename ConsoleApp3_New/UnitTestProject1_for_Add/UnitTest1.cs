using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using ConsoleApp3_New;
namespace UnitTestProject1_for_Add
{
    [TestClass]
    public class UnitTest1
    {
        [TestMethod]
        public void TestMethod1()
        {
            Bot b = new Bot();
            int var = b.addition(5, 6);
            Assert.AreEqual(11, var);
        }
    }
}
