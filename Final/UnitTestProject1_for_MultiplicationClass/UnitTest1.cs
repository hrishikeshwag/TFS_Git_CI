using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Final;

namespace UnitTestProject1_for_MultiplicationClass
{
    [TestClass]
    public class UnitTest1
    {
        [TestMethod]
        public void TestMethod1()
        {
            MultiplicationClass mc = new MultiplicationClass();
            int res = mc.multi(4, 5);
            Assert.AreEqual(21, res);
        }
    }
}
